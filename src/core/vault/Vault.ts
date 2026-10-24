import { z } from 'zod'
import { changePassphrase, createKeyMeta, unlockDataKey, type KeyMeta } from '../crypto'
import type { DataStore } from '../data/DataStore'
import type { KeyStore } from '../keys/KeyStore'

/** Document `users/{uid}/meta/keys` (voir firestore.rules). */
export const META = 'meta'
export const KEYS_DOC = 'keys'

/** Longueur minimale de la phrase secrète (D24). */
export const MIN_PASSPHRASE_LENGTH = 12

export type VaultStatus = 'setup' | 'locked' | 'unlocked'

export class VaultAlreadyExistsError extends Error {
  constructor() {
    super('Une phrase secrète existe déjà pour ce compte')
    this.name = 'VaultAlreadyExistsError'
  }
}

export class WeakPassphraseError extends Error {
  constructor() {
    super(`La phrase secrète doit faire au moins ${MIN_PASSPHRASE_LENGTH} caractères`)
    this.name = 'WeakPassphraseError'
  }
}

const keyMetaSchema = z
  .object({
    wrappedKey: z.string(),
    salt: z.string(),
    iterations: z.number().int(),
    version: z.number().int(),
  })
  .strict()

function checkStrength(passphrase: string) {
  if ([...passphrase.normalize('NFC')].length < MIN_PASSPHRASE_LENGTH) {
    throw new WeakPassphraseError()
  }
}

/**
 * Coffre de l'utilisateur : la clé de données, encapsulée par la phrase secrète dans
 * `meta/keys`, n'est déverrouillée qu'en mémoire (KeyStore). Aucune API de plateforme ici.
 */
export class Vault {
  private readonly data: DataStore
  private readonly keys: KeyStore
  private readonly uid: string

  constructor(data: DataStore, keys: KeyStore, uid: string) {
    this.data = data
    this.keys = keys
    this.uid = uid
  }

  /** Nécessite le réseau tant que `meta/keys` n'a jamais été lu dans la session. */
  async status(): Promise<VaultStatus> {
    if (await this.keys.load()) return 'unlocked'
    return (await this.readMeta()) ? 'locked' : 'setup'
  }

  /** Clé déverrouillée, ou `null` si le coffre est verrouillé. */
  key(): Promise<CryptoKey | null> {
    return this.keys.load()
  }

  /**
   * Premier lancement : crée la clé de données et l'enregistre, encapsulée, sur le serveur.
   * Attend la confirmation du serveur : aucune pesée ne doit être chiffrée avec une clé perdue.
   */
  async setup(passphrase: string): Promise<CryptoKey> {
    checkStrength(passphrase)
    // Écraser meta/keys rendrait illisibles toutes les données existantes.
    if (await this.readMeta()) throw new VaultAlreadyExistsError()
    const { key, meta } = await createKeyMeta(passphrase)
    await this.data.set(this.uid, META, KEYS_DOC, { ...meta })
    await this.keys.save(key)
    return key
  }

  /** Lève WrongPassphraseError si la phrase est incorrecte. */
  async unlock(passphrase: string): Promise<CryptoKey> {
    const meta = await this.readMeta()
    if (!meta) throw new Error('Aucune phrase secrète n’a encore été créée')
    const key = await unlockDataKey(passphrase, meta)
    await this.keys.save(key)
    return key
  }

  lock(): Promise<void> {
    return this.keys.clear()
  }

  /** Ré-encapsule la même clé : les données déjà chiffrées restent lisibles. */
  async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
    checkStrength(newPassphrase)
    const meta = await this.readMeta()
    if (!meta) throw new Error('Aucune phrase secrète n’a encore été créée')
    const newMeta = await changePassphrase(oldPassphrase, newPassphrase, meta)
    await this.data.set(this.uid, META, KEYS_DOC, { ...newMeta })
  }

  private async readMeta(): Promise<KeyMeta | null> {
    const doc = await this.data.get(this.uid, META, KEYS_DOC)
    return doc ? keyMetaSchema.parse(doc) : null
  }
}
