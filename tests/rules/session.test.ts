import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithCredential,
  signOut,
  type Auth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { SyncTracker, type NetworkTarget } from '../../src/adapters/web/SyncTracker'
import { WebDataStore } from '../../src/adapters/web/WebDataStore'
import { generateDataKey } from '../../src/core/crypto/keys'
import { PeseeRepository } from '../../src/core/pesees'

// Bloc 2.5, scénario 4 : la session tombe pendant le hors ligne, l'utilisateur se reconnecte.
setLogLevel('silent')

let env: RulesTestEnvironment
let app: FirebaseApp
let auth: Auth

const [firestoreHost, firestorePort] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8181'
).split(':')
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9199'
// L'émulateur Auth accepte un jeton Google non signé : un compte fictif, toujours le même.
const google = () =>
  GoogleAuthProvider.credential(
    JSON.stringify({ sub: 'compte-alice', email: 'alice@example.com', email_verified: true }),
  )

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-suivi-poids',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  })
  await env.clearFirestore()
  app = initializeApp({ projectId: 'demo-suivi-poids', apiKey: 'demo-api-key' }, 'session')
  auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
})

afterAll(async () => {
  await deleteApp(app)
  await env?.cleanup()
})

test('session perdue hors ligne : reconnexion du même compte, écritures en attente conservées', async () => {
  const db = initializeFirestore(app, { localCache: memoryLocalCache() })
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort))
  const reseau = new EventTarget() as EventTarget & NetworkTarget
  reseau.navigator = { onLine: false }
  const sync = new SyncTracker(reseau)

  const { user } = await signInWithCredential(auth, google())
  await disableNetwork(db)
  const repo = new PeseeRepository(new WebDataStore(db, sync), user.uid, await generateDataKey())
  const { synced } = await repo.save({ date: '2026-10-25', poids: 75.9 })
  expect(sync.pendingWrites).toBe(1)

  // La session tombe (jeton révoqué, déconnexion…) pendant le hors ligne.
  await signOut(auth)
  expect(auth.currentUser).toBeNull()

  // L'appli redemande la connexion ; l'utilisateur se reconnecte avec le même compte.
  const retour = await signInWithCredential(auth, google())
  expect(retour.user.uid).toBe(user.uid)
  reseau.dispatchEvent(new Event('online'))
  await enableNetwork(db)

  await synced
  expect(sync.pendingWrites).toBe(0)
  await env.withSecurityRulesDisabled(async (ctx) => {
    const serveur = await getDoc(doc(ctx.firestore(), `users/${user.uid}/pesees/2026-10-25`))
    expect(serveur.data()?.poids).toMatch(/^v1:/)
  })
}, 20_000)
