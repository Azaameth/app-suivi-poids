// @vitest-environment node
import { beforeAll, describe, expect, test } from 'vitest'
import {
  DecryptionError,
  MIN_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
  WrongPassphraseError,
  changePassphrase,
  createKeyMeta,
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  unlockDataKey,
  type KeyMeta,
} from '.'
import { fromBase64, toBase64 } from './encoding'

const PASSPHRASE = 'correct horse battery staple'

let key: CryptoKey
let meta: KeyMeta

beforeAll(async () => {
  ;({ key, meta } = await createKeyMeta(PASSPHRASE))
})

describe('chiffrement AES-GCM', () => {
  test('aller-retour, y compris unicode et chaîne vide', async () => {
    for (const text of ['82,4 kg', '', 'émoji 🏋️ — ok']) {
      expect(await decryptString(key, await encryptString(key, text))).toBe(text)
    }
  })

  test('format v1:<iv_b64>:<data_b64> avec IV de 12 octets', async () => {
    const payload = await encryptString(key, 'secret')
    const [version, iv, data] = payload.split(':')
    expect(version).toBe('v1')
    expect(fromBase64(iv)).toHaveLength(12)
    expect(fromBase64(data).length).toBeGreaterThan(0)
    expect(payload).not.toContain('secret')
  })

  test('IV différent à chaque chiffrement', async () => {
    const payloads = await Promise.all(Array.from({ length: 50 }, () => encryptString(key, 'x')))
    const ivs = new Set(payloads.map((p) => p.split(':')[1]))
    expect(ivs.size).toBe(50)
  })

  test('donnée altérée → DecryptionError', async () => {
    const [v, iv, data] = (await encryptString(key, 'secret')).split(':')
    const bytes = fromBase64(data)
    bytes[0] ^= 1
    const tampered = `${v}:${iv}:${toBase64(bytes)}`
    await expect(decryptString(key, tampered)).rejects.toBeInstanceOf(DecryptionError)
  })

  test('mauvaise clé → DecryptionError', async () => {
    const other = await createKeyMeta('autre phrase')
    const payload = await encryptString(key, 'secret')
    await expect(decryptString(other.key, payload)).rejects.toBeInstanceOf(DecryptionError)
  })

  test('format inconnu → DecryptionError', async () => {
    for (const bad of ['secret', 'v2:a:b', 'v1:AAAA:BBBB', 'v1:a:b:c']) {
      await expect(decryptString(key, bad)).rejects.toBeInstanceOf(DecryptionError)
    }
  })

  test('JSON', async () => {
    const value = { poids: 82.4, note: 'ok' }
    expect(await decryptJson(key, await encryptJson(key, value))).toEqual(value)
  })
})

describe('clé de données et phrase secrète', () => {
  test('itérations PBKDF2 ≥ 600 000 (OWASP)', () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000)
    expect(meta.iterations).toBe(PBKDF2_ITERATIONS)
    expect(meta.version).toBe(1)
    expect(fromBase64(meta.salt)).toHaveLength(16)
  })

  test('la clé de travail n’est pas extractible', async () => {
    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  test('déverrouillage avec la bonne phrase → mêmes données lisibles', async () => {
    const payload = await encryptString(key, 'secret')
    const unlocked = await unlockDataKey(PASSPHRASE, meta)
    expect(await decryptString(unlocked, payload)).toBe('secret')
  })

  test('mauvaise phrase → WrongPassphraseError', async () => {
    await expect(unlockDataKey('mauvaise', meta)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  test('refuse des méta-données affaiblies', async () => {
    const weak = { ...meta, iterations: MIN_PBKDF2_ITERATIONS - 1 }
    await expect(unlockDataKey(PASSPHRASE, weak)).rejects.toThrow(/itérations/)
    await expect(unlockDataKey(PASSPHRASE, { ...meta, version: 2 })).rejects.toThrow(/Version/)
  })

  test('changement de phrase : anciennes données lisibles, ancienne phrase refusée', async () => {
    const payload = await encryptString(key, 'secret')
    const newMeta = await changePassphrase(PASSPHRASE, 'nouvelle phrase', meta)
    expect(newMeta.salt).not.toBe(meta.salt)
    const unlocked = await unlockDataKey('nouvelle phrase', newMeta)
    expect(await decryptString(unlocked, payload)).toBe('secret')
    await expect(unlockDataKey(PASSPHRASE, newMeta)).rejects.toBeInstanceOf(WrongPassphraseError)
  })
})
