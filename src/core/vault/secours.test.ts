import { describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import {
  InvalidRecoveryCodeError,
  NoRecoveryCodeError,
  WrongPassphraseError,
  WrongRecoveryCodeError,
  genererCodeSecours,
  normaliserCode,
} from '../crypto'
import { PeseeRepository, type Pesee } from '../pesees'
import { KEYS_DOC, META, Vault } from '.'

const PHRASE = 'cheval agrafe batterie'
const NOUVELLE = 'correct horse staple'

function setup() {
  const services = createMemoryServices()
  return { ...services, vault: new Vault(services.data, services.keys, 'alice') }
}
const lire = (repo: PeseeRepository) => new Promise<Pesee[]>((r) => repo.watch(r))

describe('code de secours : format (D48)', () => {
  test('8 groupes de 4 caractères Crockford, différents à chaque fois', () => {
    const code = genererCodeSecours()
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(genererCodeSecours()).not.toBe(code)
  })

  test('saisie tolérante : minuscules, espaces, O→0, I/L→1', () => {
    const code = '0000-1111-2222-3333-4444-5555-6666-7777'
    expect(normaliserCode('oooo 1111-2222 3333 4444-5555 6666-7777')).toBe(code.replaceAll('-', ''))
    expect(normaliserCode('0000-iiii-2222-3333-4444-5555-6666-7777')).toBe(code.replaceAll('-', ''))
    expect(normaliserCode('0000-llll-2222-3333-4444-5555-6666-7777')).toBe(code.replaceAll('-', ''))
    expect(() => normaliserCode('trop-court')).toThrow(InvalidRecoveryCodeError)
    expect(() => normaliserCode('UUUU-1111-2222-3333-4444-5555-6666-7777')).toThrow(
      InvalidRecoveryCodeError,
    )
  })
})

describe('code de secours : coffre', () => {
  test('création du coffre : un code est rendu, meta/keys contient secours mais pas le code', async () => {
    const { data, vault } = setup()
    const { codeSecours } = await vault.setup(PHRASE)
    const meta = await data.get('alice', META, KEYS_DOC)
    expect(meta?.secours).toMatchObject({ iterations: 600000 })
    expect(JSON.stringify(meta)).not.toContain(codeSecours.replaceAll('-', ''))
    expect(await vault.aCodeSecours()).toBe(true)
  })

  test('phrase oubliée : le code permet d’en choisir une nouvelle, les pesées restent lisibles', async () => {
    const { data, vault } = setup()
    const { key, codeSecours } = await vault.setup(PHRASE)
    await new PeseeRepository(data, 'alice', key).save({ date: '2026-10-25', poids: 75.9 })
    await vault.lock()

    await vault.recuperer(codeSecours.toLowerCase(), NOUVELLE)
    expect(await vault.status()).toBe('unlocked')
    expect(await lire(new PeseeRepository(data, 'alice', (await vault.key())!))).toMatchObject([
      { poids: 75.9 },
    ])
    await vault.lock()
    await expect(vault.unlock(PHRASE)).rejects.toThrow(WrongPassphraseError)
    await vault.unlock(NOUVELLE)
    // Le code reste valable après usage.
    await vault.lock()
    await vault.recuperer(codeSecours, 'encore une autre phrase')
  })

  test('mauvais code refusé', async () => {
    const { vault } = setup()
    await vault.setup(PHRASE)
    await vault.lock()
    await expect(vault.recuperer(genererCodeSecours(), NOUVELLE)).rejects.toThrow(
      WrongRecoveryCodeError,
    )
    expect(await vault.status()).toBe('locked')
  })

  test('changer de phrase conserve le code de secours', async () => {
    const { vault } = setup()
    const { codeSecours } = await vault.setup(PHRASE)
    await vault.changePassphrase(PHRASE, NOUVELLE)
    await vault.lock()
    await vault.recuperer(codeSecours, 'troisième phrase longue')
    expect(await vault.status()).toBe('unlocked')
  })

  test('régénérer : phrase exigée, nouveau code valable, ancien inutilisable', async () => {
    const { vault } = setup()
    const { codeSecours: ancien } = await vault.setup(PHRASE)
    await expect(vault.creerCodeSecours('mauvaise phrase longue')).rejects.toThrow(
      WrongPassphraseError,
    )
    const nouveau = await vault.creerCodeSecours(PHRASE)
    await vault.lock()
    await expect(vault.recuperer(ancien, NOUVELLE)).rejects.toThrow(WrongRecoveryCodeError)
    await vault.recuperer(nouveau, NOUVELLE)
  })

  test('compte créé avant le code de secours : récupération impossible, création possible', async () => {
    const { data, vault } = setup()
    await vault.setup(PHRASE)
    const meta = (await data.get('alice', META, KEYS_DOC))!
    delete meta.secours
    await data.set('alice', META, KEYS_DOC, meta)
    expect(await vault.aCodeSecours()).toBe(false)
    await vault.lock()
    await expect(vault.recuperer(genererCodeSecours(), NOUVELLE)).rejects.toThrow(
      NoRecoveryCodeError,
    )
    await vault.unlock(PHRASE)
    await vault.creerCodeSecours(PHRASE)
    expect(await vault.aCodeSecours()).toBe(true)
  })
})
