import type { DataStore } from '../data/DataStore'
import type { Unsubscribe } from '../types'
import { decodePesee, encodePesee } from './codec'
import { PESEES, type Pesee } from './model'

/** Champs saisis par l'utilisateur ; les horodatages sont gérés ici. */
export type PeseeInput = Pick<Pesee, 'date' | 'poids' | 'note'>

/**
 * Seule porte d'entrée des écrans vers les pesées : ils ne voient que du clair typé,
 * le chiffrement et la validation se font ici, le stockage passe par le DataStore.
 */
export class PeseeRepository {
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

  /**
   * Pesées triées de la plus récente à la plus ancienne. Un document illisible (clé
   * incorrecte, donnée altérée) est écarté et signalé via `onError`.
   */
  watch(onChange: (pesees: Pesee[]) => void, onError?: (error: Error) => void): Unsubscribe {
    // Le déchiffrement est asynchrone : on ignore un résultat dépassé par un snapshot plus récent.
    let latest = 0
    return this.data.watch(
      this.uid,
      PESEES,
      async (docs) => {
        const run = ++latest
        const results = await Promise.allSettled(
          docs.map(({ id, data }) => decodePesee(this.key, id, data)),
        )
        if (run !== latest) return
        const pesees: Pesee[] = []
        for (const result of results) {
          if (result.status === 'fulfilled') pesees.push(result.value)
          else onError?.(result.reason as Error)
        }
        onChange(pesees.sort((a, b) => b.date.localeCompare(a.date)))
      },
      onError,
    )
  }

  /**
   * Crée la pesée du jour `input.date`, ou la remplace si elle existe (`existing`, lue via
   * `watch`) en conservant sa date de création. Pas de relecture : fonctionne hors ligne.
   * Rend la main dès l'écriture locale ; `synced` se résout à la confirmation du serveur
   * (hors ligne : au retour du réseau) ou se rejette s'il refuse l'écriture.
   */
  async save(input: PeseeInput, existing?: Pesee): Promise<{ synced: Promise<void> }> {
    const now = this.now()
    const pesee: Pesee = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: Math.max(now, existing?.createdAt ?? now),
    }
    if (pesee.note === undefined) delete pesee.note
    const stored = await encodePesee(this.key, pesee)
    return { synced: this.data.set(this.uid, PESEES, pesee.date, stored) }
  }

  /** Même principe que `save` : effet local immédiat, `synced` pour le serveur. */
  remove(date: string): { synced: Promise<void> } {
    return { synced: this.data.remove(this.uid, PESEES, date) }
  }
}
