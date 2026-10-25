import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  EmailAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { traduireErreurAuth } from '../../src/adapters/web/erreursAuth'
import {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MotDePasseFaibleError,
} from '../../src/core'

// Bloc 2.13 : les codes d'erreur réels de Firebase Auth sont bien ceux que l'appli traduit.
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9199'
const email = `bob-${Date.now()}@example.com`
let app: FirebaseApp
let auth: Auth

const erreur = (promesse: Promise<unknown>) =>
  promesse.then(
    () => null,
    (e: unknown) => traduireErreurAuth(e),
  )

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-suivi-poids', apiKey: 'demo-api-key' }, 'auth-email')
  auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
})

afterAll(() => deleteApp(app))

test('création, erreurs traduites, reconnexion et confirmation du mot de passe', async () => {
  expect(await erreur(createUserWithEmailAndPassword(auth, email, '123'))).toBeInstanceOf(
    MotDePasseFaibleError,
  )
  const { user } = await createUserWithEmailAndPassword(auth, email, 'motdepasse-long')
  expect(user.providerData.map((p) => p.providerId)).toEqual([EmailAuthProvider.PROVIDER_ID])
  await signOut(auth)

  expect(await erreur(createUserWithEmailAndPassword(auth, email, 'autre-long'))).toBeInstanceOf(
    EmailDejaUtiliseError,
  )
  expect(await erreur(signInWithEmailAndPassword(auth, email, 'pas-le-bon'))).toBeInstanceOf(
    IdentifiantsInvalidesError,
  )
  expect(
    await erreur(signInWithEmailAndPassword(auth, 'inconnu@example.com', 'motdepasse-long')),
  ).toBeInstanceOf(IdentifiantsInvalidesError)

  const connexion = await signInWithEmailAndPassword(auth, email, 'motdepasse-long')
  expect(connexion.user.uid).toBe(user.uid)
  const mauvais = EmailAuthProvider.credential(email, 'pas-le-bon')
  expect(await erreur(reauthenticateWithCredential(connexion.user, mauvais))).toBeInstanceOf(
    IdentifiantsInvalidesError,
  )
  const bon = EmailAuthProvider.credential(email, 'motdepasse-long')
  await expect(reauthenticateWithCredential(connexion.user, bon)).resolves.toBeTruthy()
})
