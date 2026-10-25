import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../adapters/memory'
import { PESEES, PeseeRepository } from '../core/pesees'
import { SUGGESTIONS } from '../core/suggestions'
import { createVault, fill, renderApp, signIn } from '../test/appHarness'

afterEach(cleanup)

async function start() {
  const services = createMemoryServices()
  renderApp(services)
  await signIn()
  await createVault()
  return services
}

describe('ouverture aux proches (bloc 2.8)', () => {
  test('🗨️ suggestion : refus si trop courte, puis envoi avec la version', async () => {
    const services = await start()
    fireEvent.click(screen.getByRole('button', { name: 'Suggérer une idée' }))
    const fenetre = screen.getByRole('dialog', { name: 'Une idée, un problème ?' })
    expect(within(fenetre).getByText(/pas chiffrées/)).toBeTruthy()

    fill('Ta suggestion', 'court')
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Envoyer' }))
    expect(within(fenetre).getByRole('alert').textContent).toMatch(/de 10 à 2000 caractères/)

    fireEvent.click(within(fenetre).getByRole('button', { name: '🐞 Problème' }))
    fill('Ta suggestion', 'Le graphique est trop petit sur mon téléphone')
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Envoyer' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Merci ! Suggestion envoyée ✓')).toBeTruthy()

    const docs = await new Promise<{ data: Record<string, unknown> }[]>((r) =>
      services.data.watch('uid-test', SUGGESTIONS, r),
    )
    expect(docs[0].data).toMatchObject({
      type: 'probleme',
      texte: 'Le graphique est trop petit sur mon téléphone',
      version: __APP_VERSION__,
    })
  }, 15_000)

  test('la version s’affiche dans le menu du profil', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Profil de Test' }))
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeTruthy()
  }, 15_000)

  test('supprimer mon compte : confirmation forte, tout est effacé, retour à la connexion', async () => {
    const services = await start()
    const key = await services.keys.load()
    await new PeseeRepository(services.data, 'uid-test', key!).save({
      date: '2026-10-25',
      poids: 75,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }))
    fireEvent.click(
      await screen.findByRole('button', { name: /Supprimer mon compte et mes données/ }),
    )
    const confirmer = screen.getByRole('button', { name: 'Supprimer définitivement' })
    expect((confirmer as HTMLButtonElement).disabled).toBe(true)
    fill(/Pour confirmer, tape SUPPRIMER/, 'supprimer')
    expect((confirmer as HTMLButtonElement).disabled).toBe(true)
    fill(/Pour confirmer, tape SUPPRIMER/, 'SUPPRIMER')
    fireEvent.click(confirmer)

    await screen.findByRole('button', { name: 'Se connecter avec Google' })
    const pesees = await new Promise<unknown[]>((r) => services.data.watch('uid-test', PESEES, r))
    expect(pesees).toEqual([])
    await waitFor(async () =>
      expect(await services.data.get('uid-test', 'meta', 'keys')).toBeNull(),
    )
  }, 15_000)
})
