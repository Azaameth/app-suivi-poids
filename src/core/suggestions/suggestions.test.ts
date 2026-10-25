import { describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import { supprimerCompte } from '../compte/supprimerCompte'
import { PESEES, PeseeRepository } from '../pesees'
import { Vault } from '../vault'
import { InvalidSuggestionError, SUGGESTIONS, SuggestionRepository } from '.'

describe('suggestions (D45)', () => {
  test('envoyée avec la version et la date, texte nettoyé', async () => {
    const { data } = createMemoryServices()
    const repo = new SuggestionRepository(data, 'alice', '0.2.1', () => 1000)
    await repo.envoyer({ type: 'idee', texte: '  Un rappel le matin pour se peser  ' }).synced
    const docs = await new Promise<{ data: unknown }[]>((r) => data.watch('alice', SUGGESTIONS, r))
    expect(docs.map((d) => d.data)).toEqual([
      {
        type: 'idee',
        texte: 'Un rappel le matin pour se peser',
        version: '0.2.1',
        createdAt: 1000,
      },
    ])
  })

  test.each([
    ['trop court', 'court'],
    ['trop long', 'x'.repeat(2001)],
    ['vide', '          '],
  ])('refusée : %s', (_, texte) => {
    const repo = new SuggestionRepository(createMemoryServices().data, 'alice', '0.2.1')
    expect(() => repo.envoyer({ type: 'probleme', texte })).toThrow(InvalidSuggestionError)
  })
})

describe('supprimer mon compte (D47)', () => {
  test('efface pesées, suggestions, meta/keys, la clé en mémoire et le compte', async () => {
    const services = createMemoryServices()
    await services.auth.signIn({ method: 'google' })
    const key = await new Vault(services.data, services.keys, 'alice').setup(
      'cheval agrafe batterie',
    )
    await new PeseeRepository(services.data, 'alice', key).save({ date: '2026-10-25', poids: 75 })
    await new SuggestionRepository(services.data, 'alice', '0.2.1').envoyer({
      type: 'idee',
      texte: 'Une idée de test assez longue',
    }).synced

    await supprimerCompte(services, 'alice')

    const vide = (c: string) => new Promise<unknown[]>((r) => services.data.watch('alice', c, r))
    expect(await vide(PESEES)).toEqual([])
    expect(await vide(SUGGESTIONS)).toEqual([])
    expect(await services.data.get('alice', 'meta', 'keys')).toBeNull()
    expect(await services.keys.load()).toBeNull()
    expect(services.auth.currentUser()).toBeNull()
  })
})
