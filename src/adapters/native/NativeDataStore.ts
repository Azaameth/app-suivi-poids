import { FirebaseFirestore, type CallbackId } from '@capacitor-firebase/firestore'
import type { DataStore, DocData, StoredDoc, SyncState, Unsubscribe } from '../../core'
import { SyncTracker } from '../web/SyncTracker'
import { pret } from './firebaseNatif'
import { reseauCapacitor } from './reseau'

const chemin = (uid: string, collection: string, id?: string) =>
  ['users', uid, collection, ...(id === undefined ? [] : [id])].join('/')

/**
 * Abonnement du plugin (identifiant obtenu de façon asynchrone) présenté comme un
 * `Unsubscribe` synchrone : un désabonnement précoce est appliqué dès l'identifiant reçu.
 */
function abonner(ajouter: () => Promise<CallbackId>): Unsubscribe {
  let actif = true
  let id: CallbackId | undefined
  void pret.then(ajouter).then((callbackId) => {
    if (actif) id = callbackId
    else void FirebaseFirestore.removeSnapshotListener({ callbackId })
  })
  return () => {
    actif = false
    if (id) void FirebaseFirestore.removeSnapshotListener({ callbackId: id })
  }
}

/**
 * Firestore natif (`@capacitor-firebase/firestore`) : cache hors ligne du SDK Android, toujours
 * actif. Hors ligne, les écritures sont appliquées localement et partent au retour du réseau,
 * même après fermeture de l'appli. Le réseau vient de `@capacitor/network`.
 */
export class NativeDataStore implements DataStore {
  private readonly sync: SyncTracker

  constructor(sync = new SyncTracker(reseauCapacitor())) {
    this.sync = sync
  }

  async get(uid: string, collection: string, id: string) {
    await pret
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: chemin(uid, collection, id),
    })
    return snapshot.data ?? null
  }

  set(uid: string, collection: string, id: string, data: DocData) {
    const ecriture = pret.then(() =>
      FirebaseFirestore.setDocument({ reference: chemin(uid, collection, id), data }),
    )
    return this.sync.track(ecriture)
  }

  remove(uid: string, collection: string, id: string) {
    const suppression = pret.then(() =>
      FirebaseFirestore.deleteDocument({ reference: chemin(uid, collection, id) }),
    )
    return this.sync.track(suppression)
  }

  watch(
    uid: string,
    collection: string,
    onChange: (docs: StoredDoc[]) => void,
    onError?: (error: Error) => void,
  ) {
    return abonner(() =>
      FirebaseFirestore.addCollectionSnapshotListener(
        { reference: chemin(uid, collection) },
        (evenement, erreur) => {
          if (erreur) return onError?.(erreur instanceof Error ? erreur : new Error(String(erreur)))
          onChange(
            (evenement?.snapshots ?? []).map((s) => ({
              id: s.id,
              data: (s.data ?? {}) as DocData,
            })),
          )
        },
      ),
    )
  }

  watchDoc(
    uid: string,
    collection: string,
    id: string,
    onChange: (data: DocData | null) => void,
    onError?: (error: Error) => void,
  ) {
    return abonner(() =>
      FirebaseFirestore.addDocumentSnapshotListener(
        { reference: chemin(uid, collection, id) },
        (evenement, erreur) => {
          if (erreur) return onError?.(erreur instanceof Error ? erreur : new Error(String(erreur)))
          onChange((evenement?.snapshot.data as DocData | null | undefined) ?? null)
        },
      ),
    )
  }

  watchSyncState(listener: (state: SyncState, pendingWrites: number) => void) {
    return this.sync.watch(listener)
  }
}
