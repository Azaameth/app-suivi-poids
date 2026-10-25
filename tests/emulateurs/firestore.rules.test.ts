import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  setLogLevel,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest'
import { generateDataKey } from '../../src/core/crypto/keys'
import { encodePesee } from '../../src/core/pesees'

// Les refus attendus sont vérifiés par les tests : inutile que le SDK les journalise.
setLogLevel('silent')

let env: RulesTestEnvironment

const validMeta = {
  wrappedKey: 'v1:AAAAAAAAAAAAAAAA:BBBBBBBB',
  salt: 'c2FsdHNhbHRzYWx0c2FsdA==',
  iterations: 600000,
  version: 1,
}

const validPesee = {
  date: '2026-10-24',
  poids: 'v1:AAAAAAAAAAAAAAAA:BBBBBBBB',
  note: 'v1:AAAAAAAAAAAAAAAA:CCCCCCCC',
  createdAt: 1793000000000,
  updatedAt: 1793000000000,
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-suivi-poids',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice/pesees/2026-10-24'), validPesee)
    await setDoc(doc(ctx.firestore(), 'users/alice/meta/keys'), validMeta)
  })
})

afterAll(async () => {
  await env?.cleanup()
})

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

describe('accès', () => {
  const pesee = (db: ReturnType<typeof alice>, id = '2026-10-24') =>
    doc(db, `users/alice/pesees/${id}`)
  const nouvelle = { ...validPesee, date: '2026-10-25' }

  test('le propriétaire lit, écrit et supprime ses pesées', async () => {
    await assertSucceeds(getDoc(pesee(alice())))
    await assertSucceeds(getDocs(collection(alice(), 'users/alice/pesees')))
    await assertSucceeds(setDoc(pesee(alice(), '2026-10-25'), nouvelle))
    await assertSucceeds(deleteDoc(pesee(alice())))
  })

  test('un autre utilisateur est refusé', async () => {
    await assertFails(getDoc(pesee(bob())))
    await assertFails(getDocs(collection(bob(), 'users/alice/pesees')))
    await assertFails(setDoc(pesee(bob(), '2026-10-25'), nouvelle))
    await assertFails(deleteDoc(pesee(bob())))
    await assertFails(getDoc(doc(bob(), 'users/alice/meta/keys')))
  })

  test('un visiteur non connecté est refusé', async () => {
    await assertFails(getDoc(pesee(anonymous())))
    await assertFails(setDoc(pesee(anonymous(), '2026-10-25'), nouvelle))
  })

  test('refus par défaut : collections non prévues et hors de users/{uid}', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), { value: 'v1:a:b' }))
    await assertFails(setDoc(doc(alice(), 'users/alice/a/1/b/2'), { x: 1 }))
    await assertFails(getDoc(doc(alice(), 'public/doc')))
    await assertFails(setDoc(doc(alice(), 'public/doc'), { x: 1 }))
  })
})

describe('users/{uid}/pesees/{date}', () => {
  const pesee = (id = '2026-10-25') => doc(alice(), `users/alice/pesees/${id}`)
  const nouvelle = { ...validPesee, date: '2026-10-25' }

  test('une pesée chiffrée par core/pesees est acceptée telle quelle', async () => {
    const key = await generateDataKey()
    const now = Date.now()
    const stored = await encodePesee(key, {
      date: '2026-10-25',
      poids: 72.4,
      note: 'après le footing',
      createdAt: now,
      updatedAt: now,
    })
    await assertSucceeds(setDoc(pesee(), stored))
  })

  test('pesée sans note acceptée', async () => {
    const sansNote: Partial<typeof nouvelle> = { ...nouvelle }
    delete sansNote.note
    await assertSucceeds(setDoc(pesee(), sansNote))
  })

  test.each([
    ['poids en clair', { poids: 72.4 }],
    ['note en clair', { note: 'après le footing' }],
    ['date ≠ identifiant', { date: '2026-10-26' }],
    ['champ inconnu', { taille: 180 }],
    ['horodatage non entier', { createdAt: '2026-10-25' }],
    ['updatedAt < createdAt', { updatedAt: 0 }],
  ])('refuse : %s', async (_, override) => {
    await assertFails(setDoc(pesee(), { ...nouvelle, ...override }))
  })

  test('refuse un champ obligatoire manquant', async () => {
    const sansPoids: Partial<typeof nouvelle> = { ...nouvelle }
    delete sansPoids.poids
    await assertFails(setDoc(pesee(), sansPoids))
  })

  test('refuse un identifiant qui n’est pas une date', async () => {
    await assertFails(setDoc(pesee('demain'), { ...nouvelle, date: 'demain' }))
  })

  test('mise à jour : remplacement complet accepté, createdAt compris (D6, D37)', async () => {
    const existante = doc(alice(), 'users/alice/pesees/2026-10-24')
    await assertSucceeds(setDoc(existante, { ...validPesee, updatedAt: validPesee.updatedAt + 1 }))
    await assertSucceeds(setDoc(existante, { ...validPesee, createdAt: 1, updatedAt: 2 }))
    await assertFails(setDoc(existante, { ...validPesee, createdAt: 5, updatedAt: 2 }))
  })
})

describe('users/{uid}/meta/keys', () => {
  const keys = () => doc(alice(), 'users/alice/meta/keys')

  test('lecture et mise à jour valides', async () => {
    await assertSucceeds(getDoc(keys()))
    await assertSucceeds(setDoc(keys(), { ...validMeta, iterations: 700000 }))
  })

  test('suppression : par le propriétaire seulement (supprimer mon compte, D47)', async () => {
    await assertFails(deleteDoc(doc(bob(), 'users/alice/meta/keys')))
    await assertSucceeds(deleteDoc(keys()))
  })

  test('méta-données invalides refusées', async () => {
    await assertFails(setDoc(keys(), { ...validMeta, iterations: 1000 }))
    await assertFails(setDoc(keys(), { ...validMeta, wrappedKey: 'clé-en-clair' }))
    await assertFails(setDoc(keys(), { ...validMeta, extra: true }))
    const withoutSalt: Partial<typeof validMeta> = { ...validMeta }
    delete withoutSalt.salt
    await assertFails(setDoc(keys(), withoutSalt))
  })

  test('code de secours (D48) : accepté s’il est bien formé, refusé sinon', async () => {
    const secours = { wrappedKey: 'v1:AAAAAAAAAAAAAAAA:CCCCCCCC', salt: 'c2Vs', iterations: 600000 }
    await assertSucceeds(setDoc(keys(), { ...validMeta, secours }))
    await assertFails(setDoc(keys(), { ...validMeta, secours: { ...secours, iterations: 1000 } }))
    await assertFails(
      setDoc(keys(), { ...validMeta, secours: { ...secours, wrappedKey: 'clair' } }),
    )
    await assertFails(setDoc(keys(), { ...validMeta, secours: { ...secours, code: 'K7Q2' } }))
    await assertFails(setDoc(keys(), { ...validMeta, secours: 'K7Q2-…' }))
  })

  test('aucun autre document dans meta/', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/meta/other'), validMeta))
  })
})

describe('users/{uid}/suggestions/{id} (D45)', () => {
  const suggestion = {
    type: 'idee',
    texte: 'Un rappel le matin pour se peser',
    version: '0.2.1',
    createdAt: 1793000000000,
  }
  const ref = (db: ReturnType<typeof alice>, id = 's1') => doc(db, `users/alice/suggestions/${id}`)

  test('l’auteur crée, relit et supprime sa suggestion', async () => {
    await assertSucceeds(setDoc(ref(alice()), suggestion))
    await assertSucceeds(getDoc(ref(alice())))
    await assertSucceeds(deleteDoc(ref(alice())))
  })

  test('une suggestion envoyée ne se modifie pas', async () => {
    await assertSucceeds(setDoc(ref(alice()), suggestion))
    await assertFails(setDoc(ref(alice()), { ...suggestion, texte: 'Finalement autre chose' }))
  })

  test('les autres comptes et les visiteurs sont refusés', async () => {
    await assertFails(setDoc(ref(bob()), suggestion))
    await assertFails(getDoc(ref(bob())))
    await assertFails(setDoc(ref(anonymous()), suggestion))
  })

  test.each([
    ['texte trop court', { texte: 'court' }],
    ['texte trop long', { texte: 'x'.repeat(2001) }],
    ['type inconnu', { type: 'spam' }],
    ['champ en trop', { email: 'a@b.c' }],
    ['version vide', { version: '' }],
  ])('refuse : %s', async (_, override) => {
    await assertFails(setDoc(ref(alice()), { ...suggestion, ...override }))
  })
})
