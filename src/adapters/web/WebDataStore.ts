import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { DataStore, DocData, StoredDoc, SyncState } from '../../core'
import { SyncTracker } from './SyncTracker'

/**
 * Firestore, cache en mémoire (configuré dans firebase.ts) : hors ligne, les écritures sont
 * appliquées localement et partent au retour du réseau, tant que l'onglet reste ouvert.
 */
export class WebDataStore implements DataStore {
  private readonly db: Firestore
  private readonly sync: SyncTracker

  constructor(db: Firestore, sync = new SyncTracker()) {
    this.db = db
    this.sync = sync
  }

  async get(uid: string, name: string, id: string) {
    const snapshot = await getDoc(doc(this.db, 'users', uid, name, id))
    return snapshot.exists() ? snapshot.data() : null
  }

  set(uid: string, name: string, id: string, data: DocData) {
    return this.sync.track(setDoc(doc(this.db, 'users', uid, name, id), data))
  }

  remove(uid: string, name: string, id: string) {
    return this.sync.track(deleteDoc(doc(this.db, 'users', uid, name, id)))
  }

  watch(
    uid: string,
    name: string,
    onChange: (docs: StoredDoc[]) => void,
    onError?: (error: Error) => void,
  ) {
    return onSnapshot(
      collection(this.db, 'users', uid, name),
      (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, data: d.data() }))),
      onError,
    )
  }

  watchSyncState(listener: (state: SyncState, pendingWrites: number) => void) {
    return this.sync.watch(listener)
  }
}
