import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { SyncTracker, type NetworkTarget } from '../../src/adapters/web/SyncTracker'
import { WebDataStore } from '../../src/adapters/web/WebDataStore'
import { generateDataKey } from '../../src/core/crypto/keys'
import { PeseeRepository, type Pesee } from '../../src/core/pesees'

// Bloc 2.5 : hors ligne et conflits, avec le vrai SDK Firestore coupé du réseau.
setLogLevel('silent')

let env: RulesTestEnvironment
let key: CryptoKey

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-suivi-poids',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  })
  key = await generateDataKey()
})

beforeEach(async () => {
  await env.clearFirestore()
})

afterAll(async () => {
  await env?.cleanup()
})

/** Un « appareil » d'alice : son propre client Firestore, son réseau, son suivi de synchro. */
function appareil() {
  const db = env.authenticatedContext('alice').firestore() as unknown as Firestore
  const reseau = new EventTarget() as EventTarget & NetworkTarget
  reseau.navigator = { onLine: true }
  const sync = new SyncTracker(reseau)
  const repo = new PeseeRepository(new WebDataStore(db, sync), 'alice', key)
  return {
    repo,
    sync,
    async horsLigne() {
      reseau.dispatchEvent(new Event('offline'))
      await disableNetwork(db)
    },
    async enLigne() {
      reseau.dispatchEvent(new Event('online'))
      await enableNetwork(db)
    },
  }
}

/** Attend que `watch` renvoie une liste qui satisfait `condition`. */
function attendre(repo: PeseeRepository, condition: (pesees: Pesee[]) => boolean) {
  return new Promise<Pesee[]>((resolve) => {
    const stop = repo.watch((pesees) => {
      if (condition(pesees)) {
        queueMicrotask(stop)
        resolve(pesees)
      }
    })
  })
}

/** Ce que contient réellement le serveur (règles désactivées, comme la console). */
async function surLeServeur(date: string) {
  let data: Record<string, unknown> | undefined
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore(), `users/alice/pesees/${date}`))).data()
  })
  return data
}

const pasEncore = (promise: Promise<unknown>, ms = 300) =>
  Promise.race([promise.then(() => false), new Promise((r) => setTimeout(() => r(true), ms))])

describe('hors ligne (bloc 2.5)', () => {
  test('saisie hors ligne : visible tout de suite, en attente, envoyée au retour du réseau', async () => {
    const a = appareil()
    await a.horsLigne()

    const { synced } = await a.repo.save({ date: '2026-10-25', poids: 75.9 })
    // Interface à jour immédiatement (cache local), sans attendre le serveur.
    expect(await attendre(a.repo, (p) => p.length === 1)).toMatchObject([{ poids: 75.9 }])
    expect(a.sync.state).toBe('offline')
    expect(a.sync.pendingWrites).toBe(1)
    expect(await pasEncore(synced)).toBe(true)
    expect(await surLeServeur('2026-10-25')).toBeUndefined()

    await a.enLigne()
    await synced
    expect(a.sync.state).toBe('online')
    expect(a.sync.pendingWrites).toBe(0)
    const serveur = await surLeServeur('2026-10-25')
    expect(serveur?.poids).toMatch(/^v1:/) // arrivé, et chiffré
  })

  test('modification puis suppression hors ligne : le serveur reçoit l’état final', async () => {
    const a = appareil()
    await (
      await a.repo.save({ date: '2026-10-24', poids: 76.2 })
    ).synced
    const [existante] = await attendre(a.repo, (p) => p.length === 1)

    await a.horsLigne()
    const modif = (await a.repo.save({ date: '2026-10-24', poids: 76.0 }, existante)).synced
    const ajout = (await a.repo.save({ date: '2026-10-25', poids: 75.8 })).synced
    const suppression = a.repo.remove('2026-10-24').synced
    expect(
      await attendre(a.repo, (p) => p.length === 1 && p[0].date === '2026-10-25'),
    ).toHaveLength(1)
    expect(a.sync.pendingWrites).toBe(3)

    await a.enLigne()
    await Promise.all([modif, ajout, suppression])
    expect(await surLeServeur('2026-10-24')).toBeUndefined()
    expect(await surLeServeur('2026-10-25')).toBeDefined()
  })
})

describe('conflits (D6 : dernière écriture gagnante)', () => {
  test('deux appareils en ligne : la dernière écriture l’emporte partout', async () => {
    const [a, b] = [appareil(), appareil()]
    await (
      await a.repo.save({ date: '2026-10-25', poids: 75.0 })
    ).synced
    const [vueParB] = await attendre(b.repo, (p) => p.length === 1)
    await (
      await b.repo.save({ date: '2026-10-25', poids: 74.6 }, vueParB)
    ).synced
    expect(await attendre(a.repo, (p) => p[0]?.poids === 74.6)).toMatchObject([{ poids: 74.6 }])
  })

  test('appareil hors ligne qui revient : son écriture, arrivée en dernier, l’emporte', async () => {
    const [telephone, web] = [appareil(), appareil()]
    await telephone.horsLigne()
    const tardive = (await telephone.repo.save({ date: '2026-10-25', poids: 75.9 })).synced

    // Pendant ce temps, le web saisit une autre valeur pour le même jour, confirmée.
    await (
      await web.repo.save({ date: '2026-10-25', poids: 76.4 })
    ).synced
    expect(await attendre(web.repo, (p) => p[0]?.poids === 76.4)).toHaveLength(1)

    // Retour du réseau : l'écriture du téléphone arrive après → elle gagne, partout.
    await telephone.enLigne()
    await tardive
    expect(await attendre(web.repo, (p) => p[0]?.poids === 75.9)).toMatchObject([{ poids: 75.9 }])
    expect(await attendre(telephone.repo, (p) => p[0]?.poids === 75.9)).toHaveLength(1)
  })
})
