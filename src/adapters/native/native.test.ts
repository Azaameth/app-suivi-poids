import { beforeEach, describe, expect, test, vi } from 'vitest'
import { EmailDejaUtiliseError, IdentifiantsInvalidesError } from '../../core'
import { traduireErreurAuth } from '../web/erreursAuth'
import { SyncTracker, type NetworkTarget } from '../web/SyncTracker'

// Plugins natifs simulés : seuls les appels et leurs arguments comptent ici.
const firestore = vi.hoisted(() => ({
  clearPersistence: vi.fn(() => Promise.resolve()),
  useEmulator: vi.fn(() => Promise.resolve()),
  getDocument: vi.fn(),
  setDocument: vi.fn(() => Promise.resolve()),
  deleteDocument: vi.fn(() => Promise.resolve()),
  addCollectionSnapshotListener: vi.fn(),
  addDocumentSnapshotListener: vi.fn(),
  removeSnapshotListener: vi.fn(() => Promise.resolve()),
}))
vi.mock('@capacitor-firebase/firestore', () => ({ FirebaseFirestore: firestore }))
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { useEmulator: vi.fn(() => Promise.resolve()) },
}))
vi.mock('@capacitor/network', () => ({
  Network: { getStatus: () => Promise.resolve({ connected: true }), addListener: vi.fn() },
}))

const { normaliser } = await import('./NativeAuthService')
const { NativeDataStore } = await import('./NativeDataStore')

const reseau: NetworkTarget = { addEventListener: () => {}, navigator: { onLine: true } }
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('erreurs du SDK Android', () => {
  test('codes ERROR_… traduits comme sur le web', () => {
    const erreur = (code: string) => traduireErreurAuth(normaliser({ code, message: 'x' }))
    expect(erreur('ERROR_WRONG_PASSWORD')).toBeInstanceOf(IdentifiantsInvalidesError)
    expect(erreur('ERROR_INVALID_CREDENTIAL')).toBeInstanceOf(IdentifiantsInvalidesError)
    expect(erreur('ERROR_EMAIL_ALREADY_IN_USE')).toBeInstanceOf(EmailDejaUtiliseError)
  })

  test('code déjà au format web, ou absent : inchangé', () => {
    const web = { code: 'auth/user-not-found' }
    expect(normaliser(web)).toBe(web)
    const sans = new Error('réseau')
    expect(normaliser(sans)).toBe(sans)
  })
})

describe('Firestore natif', () => {
  beforeEach(() => vi.clearAllMocks())

  test('chemins users/{uid}/…, écritures suivies jusqu’à confirmation', async () => {
    let confirmer = () => {}
    firestore.setDocument.mockReturnValueOnce(new Promise<void>((r) => (confirmer = r)))
    const sync = new SyncTracker(reseau)
    const store = new NativeDataStore(sync)
    const ecriture = store.set('u1', 'pesees', '2026-11-23', { poids: 'v1:a:b' })
    await tick()
    expect(firestore.setDocument).toHaveBeenCalledWith({
      reference: 'users/u1/pesees/2026-11-23',
      data: { poids: 'v1:a:b' },
    })
    expect(sync.state).toBe('pending')
    confirmer()
    await ecriture
    expect(sync.state).toBe('online')
  })

  test('document absent : null', async () => {
    firestore.getDocument.mockResolvedValueOnce({ snapshot: { id: 'keys', data: null } })
    expect(await new NativeDataStore(new SyncTracker(reseau)).get('u1', 'meta', 'keys')).toBeNull()
  })

  test('désabonnement avant que le plugin ait rendu son identifiant : appliqué ensuite', async () => {
    let rendreId: (id: string) => void = () => {}
    firestore.addCollectionSnapshotListener.mockReturnValueOnce(
      new Promise<string>((r) => (rendreId = r)),
    )
    const stop = new NativeDataStore(new SyncTracker(reseau)).watch('u1', 'pesees', () => {})
    stop()
    await tick()
    rendreId('cb-1')
    await tick()
    expect(firestore.removeSnapshotListener).toHaveBeenCalledWith({ callbackId: 'cb-1' })
  })

  test('instantanés de collection → documents ; erreur transmise', async () => {
    let rappel: (e: unknown, err: unknown) => void = () => {}
    firestore.addCollectionSnapshotListener.mockImplementationOnce((_o, cb) => {
      rappel = cb
      return Promise.resolve('cb-2')
    })
    const recus: unknown[] = []
    const erreurs: Error[] = []
    new NativeDataStore(new SyncTracker(reseau)).watch(
      'u1',
      'pesees',
      (docs) => recus.push(docs),
      (e) => erreurs.push(e),
    )
    await tick()
    rappel({ snapshots: [{ id: '2026-11-23', data: { poids: 'v1:a:b' } }] }, null)
    rappel(null, 'permission-denied')
    expect(recus).toEqual([[{ id: '2026-11-23', data: { poids: 'v1:a:b' } }]])
    expect(erreurs[0].message).toBe('permission-denied')
  })
})
