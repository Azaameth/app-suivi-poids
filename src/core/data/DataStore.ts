import type { Unsubscribe } from '../types'

export type DocData = Record<string, unknown>

export interface StoredDoc {
  id: string
  data: DocData
}

/**
 * `online` : connecté, tout est synchronisé.
 * `offline` : pas de réseau ; les écritures restent en file d'attente locale.
 * `pending` : connecté, mais des écritures n'ont pas encore été confirmées par le serveur.
 */
export type SyncState = 'online' | 'offline' | 'pending'

/**
 * Accès aux documents de l'utilisateur, tous sous `users/{uid}/{collection}/{id}`.
 * Les champs sensibles arrivent ici déjà chiffrés : le DataStore ne voit jamais de clair.
 */
export interface DataStore {
  get(uid: string, collection: string, id: string): Promise<DocData | null>
  /** Appliqué localement tout de suite ; la promesse se résout à la confirmation du serveur. */
  set(uid: string, collection: string, id: string, data: DocData): Promise<void>
  remove(uid: string, collection: string, id: string): Promise<void>
  /** Temps réel (onSnapshot côté Firestore) : préférer ceci à des relectures répétées. */
  watch(
    uid: string,
    collection: string,
    onChange: (docs: StoredDoc[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe
  /**
   * Appelé immédiatement avec l'état courant, puis à chaque changement. `pendingWrites` :
   * écritures appliquées localement mais pas encore confirmées par le serveur.
   */
  watchSyncState(listener: (state: SyncState, pendingWrites: number) => void): Unsubscribe
}
