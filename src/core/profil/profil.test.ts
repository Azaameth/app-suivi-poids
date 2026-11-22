import { describe, expect, test } from 'vitest'
import { MemoryDataStore } from '../../adapters/memory/MemoryDataStore'
import { generateDataKey } from '../crypto/keys'
import { META } from '../vault/Vault'
import { InvalidProfilError, PROFIL_DOC, ProfilRepository, encodeProfil, type Profil } from '.'

const UID = 'u1'

describe('profil', () => {
  test('cible et taille chiffrées, usage et tolérance en clair', async () => {
    const key = await generateDataKey()
    const stored = await encodeProfil(key, {
      usage: 'maintenir',
      cible: 70,
      tolerance: 1.5,
      taille: 178,
      updatedAt: 1,
    })
    expect(stored.usage).toBe('maintenir')
    expect(stored.tolerance).toBe(1.5)
    expect(stored.cible).toMatch(/^v1:/)
    expect(stored.taille).toMatch(/^v1:/)
    expect(JSON.stringify(stored)).not.toContain('178')
  })

  test('validation : cible exigée avec un usage, tolérance pour « maintenir » seulement, par pas de 0,5', async () => {
    const key = await generateDataKey()
    const invalides: Profil[] = [
      { usage: 'perdre', updatedAt: 1 },
      { usage: 'perdre', cible: 70, tolerance: 1, updatedAt: 1 },
      { usage: 'maintenir', cible: 70, tolerance: 0.7, updatedAt: 1 },
      { usage: 'maintenir', cible: 70, tolerance: 3.5, updatedAt: 1 },
      { usage: null, taille: 30, updatedAt: 1 },
    ]
    for (const profil of invalides) {
      await expect(encodeProfil(key, profil)).rejects.toThrow(InvalidProfilError)
    }
    await expect(
      encodeProfil(key, { usage: null, taille: 165, updatedAt: 1 }),
    ).resolves.toBeTruthy()
  })

  test('dépôt : null sans profil, puis le profil enregistré, déchiffré', async () => {
    const data = new MemoryDataStore()
    const repo = new ProfilRepository(data, UID, await generateDataKey(), () => 42)
    const vus: (Profil | null)[] = []
    repo.watch((p) => vus.push(p))
    await new Promise((r) => setTimeout(r, 0))
    await (
      await repo.save({ usage: 'perdre', cible: 72.5, taille: 180 })
    ).synced
    await new Promise((r) => setTimeout(r, 10))
    expect(vus[0]).toBeNull()
    expect(vus.at(-1)).toEqual({ usage: 'perdre', cible: 72.5, taille: 180, updatedAt: 42 })
    expect(await data.get(UID, META, PROFIL_DOC)).toMatchObject({ usage: 'perdre', updatedAt: 42 })
  })

  test('profil illisible avec une autre clé : signalé, jamais affiché', async () => {
    const data = new MemoryDataStore()
    await (
      await new ProfilRepository(data, UID, await generateDataKey()).save({
        usage: 'perdre',
        cible: 70,
      })
    ).synced
    const erreurs: Error[] = []
    const vus: unknown[] = []
    new ProfilRepository(data, UID, await generateDataKey()).watch(
      (p) => vus.push(p),
      (e) => erreurs.push(e),
    )
    await new Promise((r) => setTimeout(r, 10))
    expect(vus).toEqual([])
    expect(erreurs).toHaveLength(1)
  })
})
