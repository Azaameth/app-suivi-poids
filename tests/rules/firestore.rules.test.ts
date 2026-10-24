import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest'

let env: RulesTestEnvironment

const validMeta = {
  wrappedKey: 'v1:AAAAAAAAAAAAAAAA:BBBBBBBB',
  salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
  iterations: 600000,
  version: 1,
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-suivi-poids',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice/entries/e1'), { value: 'v1:x:y' })
    await setDoc(doc(ctx.firestore(), 'users/alice/meta/keys'), validMeta)
  })
})

afterAll(async () => {
  await env?.cleanup()
})

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

describe('données utilisateur', () => {
  test('le propriétaire lit et écrit ses documents', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/entries/e1')))
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/entries/e2'), { value: 'v1:a:b' }))
    await assertSucceeds(deleteDoc(doc(alice(), 'users/alice/entries/e1')))
  })

  test('sous-collections imbriquées autorisées au propriétaire', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/a/1/b/2'), { x: 1 }))
  })

  test('un autre utilisateur est refusé', async () => {
    await assertFails(getDoc(doc(bob(), 'users/alice/entries/e1')))
    await assertFails(setDoc(doc(bob(), 'users/alice/entries/e2'), { value: 'x' }))
    await assertFails(getDoc(doc(bob(), 'users/alice/meta/keys')))
  })

  test('un visiteur non connecté est refusé', async () => {
    await assertFails(getDoc(doc(anonymous(), 'users/alice/entries/e1')))
    await assertFails(setDoc(doc(anonymous(), 'users/alice/entries/e2'), { value: 'x' }))
  })

  test('refus par défaut hors de users/{uid}', async () => {
    await assertFails(getDoc(doc(alice(), 'public/doc')))
    await assertFails(setDoc(doc(alice(), 'public/doc'), { x: 1 }))
  })
})

describe('users/{uid}/meta/keys', () => {
  const keys = () => doc(alice(), 'users/alice/meta/keys')

  test('lecture et mise à jour valides', async () => {
    await assertSucceeds(getDoc(keys()))
    await assertSucceeds(setDoc(keys(), { ...validMeta, iterations: 700000 }))
  })

  test('suppression interdite', async () => {
    await assertFails(deleteDoc(keys()))
  })

  test('méta-données invalides refusées', async () => {
    await assertFails(setDoc(keys(), { ...validMeta, iterations: 1000 }))
    await assertFails(setDoc(keys(), { ...validMeta, wrappedKey: 'clé-en-clair' }))
    await assertFails(setDoc(keys(), { ...validMeta, extra: true }))
    const withoutSalt: Partial<typeof validMeta> = { ...validMeta }
    delete withoutSalt.salt
    await assertFails(setDoc(keys(), withoutSalt))
  })

  test('aucun autre document dans meta/', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/meta/other'), validMeta))
  })
})
