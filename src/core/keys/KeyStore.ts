/**
 * Garde la clé de données déverrouillée.
 * Web : mémoire uniquement (perdue au rechargement). Android : Keystore (jalon 3, à confirmer).
 */
export interface KeyStore {
  load(): Promise<CryptoKey | null>
  save(key: CryptoKey): Promise<void>
  clear(): Promise<void>
}
