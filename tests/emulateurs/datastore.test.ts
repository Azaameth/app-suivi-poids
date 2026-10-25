import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setLogLevel, type Firestore } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { SyncTracker, type NetworkTarget } from '../../src/adapters/web/SyncTracker'
import { WebDataStore } from '../../src/adapters/web/WebDataStore'
import { generateDataKey } from '../../src/core/crypto/keys'
import { MemoryKeyStore } from '../../src/adapters/memory/MemoryKeyStore'
import { PeseeRepository, type Pesee } from '../../src/core/pesees'
import { Vault } from '../../src/core/vault'

// Les refus attendus sont vérifiés par les tests : inutile que le SDK les journalise.
setLogLevel('silent')

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-suivi-poids',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
})

afterAll(async () => {
  await env?.cleanup()
})

function onlineWindow() {
  const target = new EventTarget() as EventTarget & NetworkTarget
  target.navigator = { onLine: true }
  return target
}

function storeFor(uid: string) {
  const db = env.authenticatedContext(uid).firestore() as unknown as Firestore
  return new WebDataStore(db, new SyncTracker(onlineWindow()))
}

describe('WebDataStore + PeseeRepository (émulateur, règles actives)', () => {
  test('ce que voit la console : poids et note illisibles', async () => {
    const repo = new PeseeRepository(storeFor('alice'), 'alice', await generateDataKey())
    const { synced } = await repo.save({ date: '2026-10-24', poids: 72.4, note: 'footing' })
    await synced

    await env.withSecurityRulesDisabled(async (ctx) => {
      const raw = (await getDoc(doc(ctx.firestore(), 'users/alice/pesees/2026-10-24'))).data()
      expect(raw).toMatchObject({ date: '2026-10-24' })
      expect(raw?.poids).toMatch(/^v1:/)
      expect(raw?.note).toMatch(/^v1:/)
      expect(JSON.stringify(raw)).not.toMatch(/72\.4|footing/)
    })
  })

  test('le propriétaire relit ses pesées en clair, en temps réel', async () => {
    const repo = new PeseeRepository(storeFor('alice'), 'alice', await generateDataKey())
    const { synced } = await repo.save({ date: '2026-10-24', poids: 72.4 })
    await synced
    const pesees = await new Promise<Pesee[]>((resolve) => {
      const stop = repo.watch((list) => {
        if (list.length) {
          stop()
          resolve(list)
        }
      })
    })
    expect(pesees).toMatchObject([{ date: '2026-10-24', poids: 72.4 }])
  })

  test('un autre utilisateur ne peut ni lire ni écrire chez alice', async () => {
    const key = await generateDataKey()
    const intrus = new PeseeRepository(storeFor('bob'), 'alice', key)
    const { synced } = await intrus.save({ date: '2026-10-24', poids: 1 })
    await expect(synced).rejects.toMatchObject({ code: 'permission-denied' })
    const error = await new Promise<Error>((resolve) => intrus.watch(() => {}, resolve))
    expect(error).toMatchObject({ code: 'permission-denied' })
  })

  test('coffre : meta/keys créé par Vault accepté par les règles, puis déverrouillable', async () => {
    const store = storeFor('alice')
    const phrase = 'cheval agrafe batterie'
    await new Vault(store, new MemoryKeyStore(), 'alice').setup(phrase)
    // Autre appareil (coffre neuf) : retrouve la clé et ne peut pas écraser meta/keys.
    const ailleurs = new Vault(storeFor('alice'), new MemoryKeyStore(), 'alice')
    expect(await ailleurs.status()).toBe('locked')
    await expect(ailleurs.setup('une autre phrase longue')).rejects.toThrow(/existe déjà/)
    await ailleurs.unlock(phrase)
    expect(await ailleurs.status()).toBe('unlocked')
  })
})
