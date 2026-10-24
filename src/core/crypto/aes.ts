import { fromBase64, randomBytes, toBase64 } from './encoding'

/** Préfixe de format : permet de changer d'algorithme plus tard sans casser l'existant. */
export const FORMAT_VERSION = 'v1'

/** 96 bits : taille d'IV recommandée pour AES-GCM (NIST SP 800-38D). */
export const IV_LENGTH = 12

export class DecryptionError extends Error {
  constructor(message = 'Déchiffrement impossible (clé incorrecte ou donnée altérée)') {
    super(message)
    this.name = 'DecryptionError'
  }
}

export interface Envelope {
  iv: Uint8Array<ArrayBuffer>
  data: Uint8Array<ArrayBuffer>
}

export function formatEnvelope({ iv, data }: Envelope): string {
  return `${FORMAT_VERSION}:${toBase64(iv)}:${toBase64(data)}`
}

export function parseEnvelope(payload: string): Envelope {
  const parts = payload.split(':')
  if (parts.length !== 3 || parts[0] !== FORMAT_VERSION) {
    throw new DecryptionError(`Format chiffré non reconnu (attendu ${FORMAT_VERSION}:<iv>:<data>)`)
  }
  try {
    const iv = fromBase64(parts[1])
    const data = fromBase64(parts[2])
    if (iv.length !== IV_LENGTH) throw new Error()
    return { iv, data }
  } catch {
    throw new DecryptionError('Format chiffré invalide')
  }
}

/** Chiffre du texte en AES-GCM 256. Nouvel IV aléatoire à chaque appel (ne jamais réutiliser). */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH)
  const encoded = new TextEncoder().encode(plaintext)
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded))
  return formatEnvelope({ iv, data })
}

export async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  const { iv, data } = parseEnvelope(payload)
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(plain)
  } catch {
    // GCM vérifie l'intégrité : mauvaise clé ou donnée modifiée → échec.
    throw new DecryptionError()
  }
}

/** Raccourci pour les valeurs non textuelles (nombres, objets) : sérialisées en JSON. */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  return encryptString(key, JSON.stringify(value))
}

export async function decryptJson<T>(key: CryptoKey, payload: string): Promise<T> {
  return JSON.parse(await decryptString(key, payload)) as T
}
