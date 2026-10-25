import { describe, expect, test, vi } from 'vitest'
import { MemoryDataStore } from '../../adapters/memory/MemoryDataStore'
import { generateDataKey } from '../crypto/keys'
import { PESEES, PeseeRepository, type Pesee } from '.'

async function setup() {
  const data = new MemoryDataStore()
  const key = await generateDataKey()
  let now = 1_000
  const repo = new PeseeRepository(data, 'alice', key, () => now)
  const tick = (ms: number) => (now += ms)
  return { data, key, repo, tick }
}

/** Attend le prochain état des pesées (le déchiffrement est asynchrone). */
function nextPesees(repo: PeseeRepository, count: number) {
  return new Promise<Pesee[]>((resolve) => {
    const stop = repo.watch((pesees) => {
      if (pesees.length === count) {
        resolve(pesees)
        queueMicrotask(stop)
      }
    })
  })
}

describe('PeseeRepository', () => {
  test('enregistre chiffré, restitue en clair, trié du plus récent au plus ancien', async () => {
    const { data, repo } = await setup()
    await repo.save({ date: '2026-10-23', poids: 73 })
    await repo.save({ date: '2026-10-24', poids: 72.4, note: 'footing' })

    const pesees = await nextPesees(repo, 2)
    expect(pesees.map((p) => p.date)).toEqual(['2026-10-24', '2026-10-23'])
    expect(pesees[0]).toMatchObject({ poids: 72.4, note: 'footing' })

    const stored = await data.get('alice', PESEES, '2026-10-24')
    expect(stored?.poids).toMatch(/^v1:/)
    expect(JSON.stringify(stored)).not.toMatch(/72\.4|footing/)
  })

  test('modification : createdAt conservé, updatedAt avance', async () => {
    const { repo, tick } = await setup()
    await repo.save({ date: '2026-10-24', poids: 72.4 })
    const [existing] = await nextPesees(repo, 1)
    tick(5_000)
    await repo.save({ date: '2026-10-24', poids: 72.1 }, existing)
    const [updated] = await nextPesees(repo, 1)
    expect(updated).toMatchObject({ poids: 72.1, createdAt: 1_000, updatedAt: 6_000 })
  })

  test('deux saisies le même jour → un seul document, avec la dernière valeur', async () => {
    const { data, repo } = await setup()
    await repo.save({ date: '2026-10-24', poids: 72.4 })
    const [existing] = await nextPesees(repo, 1)
    await repo.save({ date: '2026-10-24', poids: 71.8 }, existing)
    const pesees = await nextPesees(repo, 1)
    expect(pesees).toMatchObject([{ date: '2026-10-24', poids: 71.8 }])
    const docs = await new Promise<unknown[]>((resolve) => data.watch('alice', PESEES, resolve))
    expect(docs).toHaveLength(1)
  })

  test('suppression', async () => {
    const { repo } = await setup()
    await repo.save({ date: '2026-10-24', poids: 72.4 })
    await repo.remove('2026-10-24').synced
    expect(await nextPesees(repo, 0)).toEqual([])
  })

  test('save rend la main avant la confirmation du serveur', async () => {
    const { data, repo } = await setup()
    let confirm!: () => void
    data.set = vi.fn(() => new Promise<void>((resolve) => (confirm = resolve)))
    const { synced } = await repo.save({ date: '2026-10-24', poids: 72.4 })
    const done = vi.fn()
    void synced.then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    confirm()
    await synced
    expect(done).toHaveBeenCalled()
  })

  test('un document illisible est écarté et signalé, les autres restent visibles', async () => {
    const { data, repo } = await setup()
    await repo.save({ date: '2026-10-24', poids: 72.4 })
    const other = new PeseeRepository(data, 'alice', await generateDataKey())
    await other.save({ date: '2026-10-25', poids: 99 })

    const onError = vi.fn()
    const pesees = await new Promise<Pesee[]>((resolve) => repo.watch(resolve, onError))
    expect(pesees.map((p) => p.date)).toEqual(['2026-10-24'])
    expect(onError).toHaveBeenCalledOnce()
  })
})
