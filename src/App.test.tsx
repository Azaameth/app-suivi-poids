import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from './adapters/memory'
import type { MemoryDataStore } from './adapters/memory/MemoryDataStore'
import {
  PHRASE,
  createVault,
  fill,
  menuProfil,
  renderApp,
  seDeconnecter,
  signIn,
} from './test/appHarness'

afterEach(cleanup)

test('affiche le titre', () => {
  renderApp()
  expect(screen.getByRole('heading', { level: 1, name: 'Professeur Machimoto' })).toBeTruthy()
})

test('connexion Google puis déconnexion', async () => {
  renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
  expect(await screen.findByRole('button', { name: 'Profil de Test' })).toBeTruthy()
  seDeconnecter()
  expect(await screen.findByRole('button', { name: 'Se connecter avec Google' })).toBeTruthy()
})

test('affiche une erreur si la connexion échoue', async () => {
  const services = createMemoryServices()
  services.auth.signIn = () => Promise.reject(new Error('popup fermée'))
  renderApp(services)
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/Connexion impossible/)
})

test('indicateur de synchro visible une fois connecté', async () => {
  const services = renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
  expect((await screen.findByRole('status')).textContent).toMatch(/En ligne/)
  act(() => (services.data as MemoryDataStore).setSyncState('offline'))
  expect(screen.getByRole('status').textContent).toMatch(/Hors ligne/)
  act(() => (services.data as MemoryDataStore).setSyncState('offline', 2))
  expect(screen.getByRole('status').textContent).toMatch(/Hors ligne : 2 modifications en attente/)
})

test('premier lancement : création du coffre, verrouillage, déverrouillage', async () => {
  renderApp()
  await signIn()
  await createVault()

  menuProfil('🔒 Verrouiller')
  await screen.findByRole('heading', { name: 'Coffre verrouillé' })
  expect(screen.queryByRole('heading', { name: 'Tableau de bord' })).toBeNull()

  fill('Phrase secrète', 'pas la bonne phrase')
  fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }))
  expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toMatch(
    /incorrecte/,
  )

  fill('Phrase secrète', PHRASE)
  fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }))
  await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
}, 15_000)

test('création refusée si la confirmation diffère', async () => {
  renderApp()
  await signIn()
  await screen.findByRole('heading', { name: 'Choisis ta phrase secrète' })
  fill('Phrase secrète', PHRASE)
  fill('Confirmation', PHRASE + ' !')
  fireEvent.click(screen.getByRole('button', { name: 'Créer mon coffre' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/ne correspondent pas/)
})

test('verrouillage automatique après inactivité', async () => {
  renderApp(createMemoryServices(), 200)
  await signIn()
  await createVault()
  await screen.findByRole('heading', { name: 'Coffre verrouillé' }, { timeout: 2000 })
}, 15_000)

test('la déconnexion verrouille le coffre', async () => {
  const services = renderApp()
  await signIn()
  await createVault()
  seDeconnecter()
  await screen.findByRole('button', { name: 'Se connecter avec Google' })
  expect(await services.keys.load()).toBeNull()
  await signIn()
  await screen.findByRole('heading', { name: 'Coffre verrouillé' })
}, 15_000)

describe('Machimoto dans les parcours (bloc 2.10)', () => {
  const expressions = (zone = 'main') =>
    [...document.querySelectorAll(`${zone} img.mascotte`)].map((img) =>
      img.getAttribute('data-expression'),
    )

  test('déconnexion : Machimoto triste, « Rester » garde la session', async () => {
    renderApp()
    await signIn()
    await createVault()
    menuProfil('🚪 Se déconnecter')
    const fenetre = screen.getByRole('dialog', { name: 'Se déconnecter' })
    expect(within(fenetre).getByText(/À bientôt/)).toBeTruthy()
    expect(fenetre.querySelector('img.mascotte')?.getAttribute('data-expression')).toBe('triste')
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Rester' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Profil de Test' })).toBeTruthy()
  }, 15_000)

  test('accueil guidé : étape 1 puis étape 2, Machimoto ravi au code de secours', async () => {
    renderApp()
    await signIn()
    await screen.findByText('Étape 1 sur 2')
    expect(screen.getByText(/Sans ta phrase ni ton code de secours/)).toBeTruthy()
    fill('Phrase secrète', PHRASE)
    fill('Confirmation', PHRASE)
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon coffre' }))
    await screen.findByText('Étape 2 sur 2')
    expect(expressions()).toContain('ravi')
  }, 15_000)

  test('connexion échouée : Machimoto triste ; images décoratives', async () => {
    const services = createMemoryServices()
    services.auth.signIn = () => Promise.reject(new Error('popup fermée'))
    renderApp(services)
    expect(expressions('.accueil')).toEqual(['content'])
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
    await screen.findByRole('alert')
    expect(expressions('.accueil')).toEqual(['triste'])
    for (const img of document.querySelectorAll('img.mascotte')) {
      expect(img.getAttribute('alt')).toBe('')
    }
  })
})
