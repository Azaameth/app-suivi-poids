import { z } from 'zod'
import {
  ajouterCodeSecours,
  changePassphrase,
  createKeyMeta,
  exporterCleBrute,
  genererCodeSecours,
  importerCleBrute,
  normaliserCode,
  remplacerPhraseAvecCode,
  unlockDataKey,
  type KeyMeta,
} from '../crypto'
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

const enveloppeSchema = z
  .object({ wrappedKey: z.string(), salt: z.string(), iterations: z.number().int() })
  .strict()

const keyMetaSchema = enveloppeSchema.extend({
  version: z.number().int(),
  secours: enveloppeSchema.optional(),
})

function checkStrength(passphrase: string) {
  if ([...passphrase.normalize('NFC')].length < MIN_PASSPHRASE_LENGTH) {
    throw new WeakPassphraseError()
  }
}

/**
 * Coffre de l'utilisateur : la clé de données, encapsulée par la phrase secrète dans
 * `meta/keys`, n'est déverrouillée qu'en mémoire (KeyStore). Sur Android, elle est aussi
 * conservée sur l'appareil, liée à l'empreinte (`keys.appareil`, D13). Aucune API de plateforme.
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
   * Premier lancement : crée la clé de données et l'enregistre, encapsulée par la phrase et par
   * un code de secours (D48), sur le serveur. Le code n'est renvoyé qu'ici : à afficher une fois.
   * Attend la confirmation du serveur : aucune pesée ne doit être chiffrée avec une clé perdue.
   */
  async setup(passphrase: string): Promise<{ key: CryptoKey; codeSecours: string }> {
    checkStrength(passphrase)
    // Écraser meta/keys rendrait illisibles toutes les données existantes.
    if (await this.readMeta()) throw new VaultAlreadyExistsError()
    const codeSecours = genererCodeSecours()
    const created = await createKeyMeta(passphrase, normaliserCode(codeSecours))
    await this.data.set(this.uid, META, KEYS_DOC, { ...created.meta })
    // Android : la phrase vient d'être saisie, la clé est confiée à l'appareil dès maintenant.
    const key = this.keys.appareil
      ? await this.deverrouillerEtConfier(passphrase, created.meta)
      : created.key
    await this.keys.save(key)
    return { key, codeSecours }
  }

  /** Un code de secours existe-t-il pour ce compte ? */
  async aCodeSecours(): Promise<boolean> {
    return Boolean((await this.readMeta())?.secours)
  }

  /**
   * Crée ou régénère le code de secours (l'ancien devient inutile). La phrase actuelle est
   * exigée : la clé en mémoire n'est pas extractible, et c'est une action sensible.
   */
  async creerCodeSecours(passphrase: string): Promise<string> {
    const meta = await this.readMeta()
    if (!meta) throw new Error('Aucune phrase secrète n’a encore été créée')
    const codeSecours = genererCodeSecours()
    await this.data.set(this.uid, META, KEYS_DOC, {
      ...(await ajouterCodeSecours(passphrase, meta, codeSecours)),
    })
    return codeSecours
  }

  /**
   * Phrase oubliée : le code de secours permet d'en choisir une nouvelle, sans toucher aux
   * données. Le code reste valable. Lève WrongRecoveryCodeError / NoRecoveryCodeError.
   */
  async recuperer(codeSecours: string, nouvellePhrase: string): Promise<CryptoKey> {
    checkStrength(nouvellePhrase)
    const meta = await this.readMeta()
    if (!meta) throw new Error('Aucune phrase secrète n’a encore été créée')
    const newMeta = await remplacerPhraseAvecCode(codeSecours, nouvellePhrase, meta)
    await this.data.set(this.uid, META, KEYS_DOC, { ...newMeta })
    return this.unlock(nouvellePhrase)
  }

  /**
   * Lève WrongPassphraseError si la phrase est incorrecte. Sur Android, confie aussi la clé à
   * l'appareil (empreinte) si ce n'est pas déjà fait : voir `deverrouillerEtConfier`.
   */
  async unlock(passphrase: string): Promise<CryptoKey> {
    const meta = await this.readMeta()
    if (!meta) throw new Error('Aucune phrase secrète n’a encore été créée')
    const key = await this.deverrouillerEtConfier(passphrase, meta)
    await this.keys.save(key)
    return key
  }

  /**
   * Clé non extractible pour l'usage courant. Sur un appareil qui peut conserver la clé
   * (Android, D13) et ne l'a pas encore : la lui confie, ce qui demande l'empreinte. Un refus ou
   * une erreur de l'appareil n'empêche pas le déverrouillage : la phrase sera redemandée.
   */
  private async deverrouillerEtConfier(passphrase: string, meta: KeyMeta): Promise<CryptoKey> {
    const appareil = this.keys.appareil
    // Le repli par la phrase ne doit jamais dépendre de l'appareil : une erreur du plugin ici
    // vaut « ne rien conserver ».
    const confier =
      appareil !== undefined &&
      !(await appareil.presente(this.uid).catch(() => true)) &&
      (await appareil.disponible().catch(() => false))
    if (!appareil || !confier) return unlockDataKey(passphrase, meta)
    const brute = await exporterCleBrute(
      await unlockDataKey(passphrase, meta, { extractable: true }),
    )
    try {
      const key = await importerCleBrute(brute)
      await appareil.conserver(this.uid, brute).catch(() => {})
      return key
    } finally {
      brute.fill(0)
    }
  }

  /** Une clé est-elle conservée sur cet appareil (déverrouillage par empreinte possible) ? */
  async cleSurAppareil(): Promise<boolean> {
    return (await this.keys.appareil?.presente(this.uid)) ?? false
  }

  /**
   * Déverrouille par l'empreinte, avec la clé conservée sur l'appareil. Lève
   * EmpreinteAnnuleeError (réessayer, ou la phrase) ou CleAppareilInvalideeError (phrase requise).
   */
  async deverrouillerAppareil(): Promise<CryptoKey> {
    const appareil = this.keys.appareil
    if (!appareil) throw new Error('Cet appareil ne conserve pas de clé')
    const brute = await appareil.restituer(this.uid)
    try {
      const key = await importerCleBrute(brute)
      await this.keys.save(key)
      return key
    } finally {
      brute.fill(0)
    }
  }

  /**
   * Verrouille : efface la clé en mémoire. Celle conservée sur l'appareil reste, l'empreinte
   * suffit à rouvrir (inactivité, D12 ; arbitrage #82).
   */
  lock(): Promise<void> {
    return this.keys.clear()
  }

  /** Verrouille et oublie la clé conservée sur l'appareil (déconnexion). */
  async oublier(): Promise<void> {
    await this.keys.clear()
    await this.keys.appareil?.oublier(this.uid)
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
