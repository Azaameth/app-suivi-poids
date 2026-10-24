import type { Unsubscribe } from '../types'

export type DocData = Record<string, unknown>

export interface StoredDoc {
  id: string
  data: DocData
}

/**
 * Accès aux documents de l'utilisateur, tous sous `users/{uid}/{collection}/{id}`.
 * Les champs sensibles arrivent ici déjà chiffrés : le DataStore ne voit jamais de clair.
 */
export interface DataStore {
  get(uid: string, collection: string, id: string): Promise<DocData | null>
  set(uid: string, collection: string, id: string, data: DocData): Promise<void>
  remove(uid: string, collection: string, id: string): Promise<void>
  /** Temps réel (onSnapshot côté Firestore) : préférer ceci à des relectures répétées. */
  watch(
    uid: string,
    collection: string,
    onChange: (docs: StoredDoc[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe
}
