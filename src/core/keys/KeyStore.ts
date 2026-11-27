/**
 * Garde la clé de données déverrouillée, en mémoire (web et Android).
 * Android ajoute `appareil` : la clé conservée sur le téléphone, liée à l'empreinte (D13, #82).
 */
export interface KeyStore {
  load(): Promise<CryptoKey | null>
  save(key: CryptoKey): Promise<void>
  /** Verrouille : efface la clé en mémoire (pas celle conservée sur l'appareil). */
  clear(): Promise<void>
  /** Absent sur le web : la clé n'y quitte jamais la mémoire (D13). */
  appareil?: CleAppareil
}

/**
 * Clé de données conservée sur l'appareil, utilisable seulement après authentification
 * biométrique (Android : clé du Keystore exigeant l'empreinte). Une clé par compte (`uid`).
 * Les octets bruts ne font que transiter : le coffre les réimporte aussitôt en clé non extractible.
 */
export interface CleAppareil {
  /** L'appareil peut-il conserver une clé (capteur présent, empreinte enregistrée) ? */
  disponible(): Promise<boolean>
  /** Une clé est-elle conservée pour ce compte ? Sans authentification. */
  presente(uid: string): Promise<boolean>
  /** Conserve la clé brute ; demande l'empreinte. Lève EmpreinteAnnuleeError. */
  conserver(uid: string, brute: Uint8Array): Promise<void>
  /**
   * Restitue la clé brute ; demande l'empreinte. Lève EmpreinteAnnuleeError, ou
   * CleAppareilInvalideeError si les empreintes du téléphone ont changé (clé alors oubliée).
   */
  restituer(uid: string): Promise<Uint8Array>
  /** Oublie la clé de ce compte (déconnexion, suppression du compte, clé invalidée). */
  oublier(uid: string): Promise<void>
}

/** L'utilisateur a annulé ou échoué l'authentification biométrique : la phrase reste possible. */
export class EmpreinteAnnuleeError extends Error {
  constructor() {
    super('Empreinte non reconnue ou annulée')
    this.name = 'EmpreinteAnnuleeError'
  }
}

/** Empreintes modifiées sur le téléphone : la clé conservée est inutilisable, phrase requise. */
export class CleAppareilInvalideeError extends Error {
  constructor() {
    super('Les empreintes du téléphone ont changé : saisis ta phrase secrète')
    this.name = 'CleAppareilInvalideeError'
  }
}
