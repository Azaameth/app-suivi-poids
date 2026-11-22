import { decryptJson, encryptJson } from '../crypto'
import type { DocData } from '../data/DataStore'
import { profilSchema, storedProfilSchema, type Profil, type StoredProfil } from './model'

export class InvalidProfilError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidProfilError'
  }
}

/** Valide un profil en clair puis chiffre `cible` et `taille`. */
export async function encodeProfil(key: CryptoKey, profil: Profil): Promise<StoredProfil> {
  const result = profilSchema.safeParse(profil)
  if (!result.success) throw new InvalidProfilError(result.error.message)
  const { cible, taille, ...clair } = result.data
  return storedProfilSchema.parse({
    ...clair,
    ...(cible !== undefined && { cible: await encryptJson(key, cible) }),
    ...(taille !== undefined && { taille: await encryptJson(key, taille) }),
  })
}

/** Valide un document lu puis déchiffre ; lève DecryptionError si la clé est mauvaise. */
export async function decodeProfil(key: CryptoKey, data: DocData): Promise<Profil> {
  const stored = storedProfilSchema.safeParse(data)
  if (!stored.success) throw new InvalidProfilError(stored.error.message)
  const { cible, taille, ...clair } = stored.data
  const result = profilSchema.safeParse({
    ...clair,
    ...(cible !== undefined && { cible: await decryptJson<unknown>(key, cible) }),
    ...(taille !== undefined && { taille: await decryptJson<unknown>(key, taille) }),
  })
  if (!result.success) throw new InvalidProfilError(result.error.message)
  return result.data
}
