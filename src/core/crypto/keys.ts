import { DecryptionError, IV_LENGTH, formatEnvelope, parseEnvelope } from './aes'
import { fromBase64, randomBytes, toBase64 } from './encoding'

/**
 * Itérations PBKDF2-HMAC-SHA256 : 600 000 = minimum recommandé par l'OWASP
 * (Password Storage Cheat Sheet, 2023+). Stocké dans les méta-données pour pouvoir
 * l'augmenter plus tard ; une valeur inférieure est refusée au déverrouillage.
 */
export const PBKDF2_ITERATIONS = 600_000
export const MIN_PBKDF2_ITERATIONS = 600_000
export const SALT_LENGTH = 16
export const KEY_META_VERSION = 1

/** Document Firestore `users/{uid}/meta/keys`. Ne contient rien de secret en clair. */
export interface KeyMeta {
  /** Clé de données chiffrée par la clé dérivée de la phrase secrète (format v1:iv:data). */
  wrappedKey: string
  salt: string
  iterations: number
  version: number
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('Phrase secrète incorrecte')
    this.name = 'WrongPassphraseError'
  }
}

const DATA_KEY_ALGO = { name: 'AES-GCM', length: 256 } as const

/** Génère la clé de données (une seule par utilisateur, elle ne change jamais). */
export async function generateDataKey(): Promise<CryptoKey> {
  // Extractible uniquement pour pouvoir être encapsulée juste après.
  return crypto.subtle.generateKey(DATA_KEY_ALGO, true, ['encrypt', 'decrypt'])
}

/** Clé d'encapsulation dérivée de la phrase secrète (PBKDF2-SHA256 → AES-GCM 256). */
export async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    DATA_KEY_ALGO,
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

async function wrap(dataKey: CryptoKey, passphrase: string): Promise<KeyMeta> {
  const salt = randomBytes(SALT_LENGTH)
  const wrappingKey = await deriveWrappingKey(passphrase, salt, PBKDF2_ITERATIONS)
  const iv = randomBytes(IV_LENGTH)
  const data = new Uint8Array(
    await crypto.subtle.wrapKey('raw', dataKey, wrappingKey, { name: 'AES-GCM', iv }),
  )
  return {
    wrappedKey: formatEnvelope({ iv, data }),
    salt: toBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    version: KEY_META_VERSION,
  }
}

/** Premier usage : crée la clé de données et ses méta-données à enregistrer. */
export async function createKeyMeta(
  passphrase: string,
): Promise<{ key: CryptoKey; meta: KeyMeta }> {
  const generated = await generateDataKey()
  const meta = await wrap(generated, passphrase)
  // On renvoie une version non extractible pour l'usage courant.
  return { key: await unlockDataKey(passphrase, meta), meta }
}

/**
 * Déverrouille la clé de données. `extractable` ne sert qu'à l'adaptateur natif
 * s'il doit la placer dans le Keystore Android (jalon 3).
 */
export async function unlockDataKey(
  passphrase: string,
  meta: KeyMeta,
  { extractable = false } = {},
): Promise<CryptoKey> {
  if (meta.version !== KEY_META_VERSION) {
    throw new Error(`Version de méta-données de clé non supportée : ${meta.version}`)
  }
  if (!Number.isInteger(meta.iterations) || meta.iterations < MIN_PBKDF2_ITERATIONS) {
    throw new Error(`Nombre d'itérations PBKDF2 insuffisant : ${meta.iterations}`)
  }
  const { iv, data } = parseEnvelope(meta.wrappedKey)
  const wrappingKey = await deriveWrappingKey(passphrase, fromBase64(meta.salt), meta.iterations)
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      data,
      wrappingKey,
      { name: 'AES-GCM', iv },
      DATA_KEY_ALGO,
      extractable,
      ['encrypt', 'decrypt'],
    )
  } catch (error) {
    if (error instanceof DecryptionError) throw error
    throw new WrongPassphraseError()
  }
}

/** Change la phrase secrète : seule l'encapsulation change, les données restent lisibles. */
export async function changePassphrase(
  oldPassphrase: string,
  newPassphrase: string,
  meta: KeyMeta,
): Promise<KeyMeta> {
  const key = await unlockDataKey(oldPassphrase, meta, { extractable: true })
  return wrap(key, newPassphrase)
}
