import type { DataStore } from '../data/DataStore'
import type { Unsubscribe } from '../types'
import { META } from '../vault/Vault'
import { decodeProfil, encodeProfil } from './codec'
import { PROFIL_DOC, type Profil, type ProfilInput } from './model'

/** Lecture et écriture du profil (objectif, taille), chiffré comme les pesées. */
export class ProfilRepository {
  private readonly data: DataStore
  private readonly uid: string
  private readonly key: CryptoKey
  private readonly now: () => number

  constructor(data: DataStore, uid: string, key: CryptoKey, now: () => number = Date.now) {
    this.data = data
    this.uid = uid
    this.key = key
    this.now = now
  }

  /** `null` tant qu'aucun profil n'a été enregistré. Un profil illisible est signalé via `onError`. */
  watch(onChange: (profil: Profil | null) => void, onError?: (error: Error) => void): Unsubscribe {
    let latest = 0
    return this.data.watchDoc(
      this.uid,
      META,
      PROFIL_DOC,
      async (doc) => {
        const run = ++latest
        try {
          const profil = doc ? await decodeProfil(this.key, doc) : null
          if (run === latest) onChange(profil)
        } catch (error) {
          if (run === latest) onError?.(error as Error)
        }
      },
      onError,
    )
  }

  /** Effet local immédiat (hors ligne compris) ; `synced` à la confirmation du serveur. */
  async save(input: ProfilInput): Promise<{ synced: Promise<void> }> {
    const profil: Profil = { ...input, updatedAt: this.now() }
    for (const champ of ['cible', 'tolerance', 'taille'] as const) {
      if (profil[champ] === undefined) delete profil[champ]
    }
    const stored = await encodeProfil(this.key, profil)
    return { synced: this.data.set(this.uid, META, PROFIL_DOC, stored) }
  }
}
