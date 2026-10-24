import { decryptJson, decryptString, encryptJson, encryptString } from '../crypto'
import type { DocData } from '../data/DataStore'
import { peseeSchema, storedPeseeSchema, type Pesee, type StoredPesee } from './model'

export class InvalidPeseeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPeseeError'
  }
}

/** Valide une pesée en clair puis chiffre `poids` et `note` pour le stockage. */
export async function encodePesee(key: CryptoKey, pesee: Pesee): Promise<StoredPesee> {
  const result = peseeSchema.safeParse(pesee)
  if (!result.success) throw new InvalidPeseeError(result.error.message)
  const { note, poids, ...clear } = result.data
  return storedPeseeSchema.parse({
    ...clear,
    poids: await encryptJson(key, poids),
    ...(note !== undefined && { note: await encryptString(key, note) }),
  })
}

/**
 * Valide un document lu dans le DataStore, vérifie qu'il correspond à son identifiant,
 * puis déchiffre. Lève DecryptionError si la clé est mauvaise ou la donnée altérée.
 */
export async function decodePesee(key: CryptoKey, id: string, data: DocData): Promise<Pesee> {
  const stored = storedPeseeSchema.safeParse(data)
  if (!stored.success) throw new InvalidPeseeError(stored.error.message)
  if (stored.data.date !== id) throw new InvalidPeseeError(`Date ${stored.data.date} ≠ id ${id}`)
  const { note, poids, ...clear } = stored.data
  const result = peseeSchema.safeParse({
    ...clear,
    poids: await decryptJson<unknown>(key, poids),
    ...(note !== undefined && { note: await decryptString(key, note) }),
  })
  if (!result.success) throw new InvalidPeseeError(result.error.message)
  return result.data
}
