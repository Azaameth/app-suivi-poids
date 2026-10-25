import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createMemoryServices } from './adapters/memory'
import type { MemoryDataStore } from './adapters/memory/MemoryDataStore'
import { PHRASE, createVault, fill, renderApp, signIn } from './test/appHarness'

afterEach(cleanup)

test('affiche le titre', () => {
  renderApp()
  expect(screen.getByRole('heading', { level: 1, name: 'Professeur Machimoto' })).toBeTruthy()
})

test('connexion Google puis déconnexion', async () => {
  renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
  expect(await screen.findByText(/Connecté : Test/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
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

  fireEvent.click(screen.getByRole('button', { name: 'Export & réglages' }))
  fireEvent.click(screen.getByRole('button', { name: '🔒 Verrouiller' }))
  await screen.findByRole('heading', { name: 'Coffre verrouillé' })
  expect(screen.queryByRole('heading', { name: 'Pesée du jour' })).toBeNull()

  fill('Phrase secrète', 'pas la bonne phrase')
  fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }))
  expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toMatch(
    /incorrecte/,
  )

  fill('Phrase secrète', PHRASE)
  fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }))
  await screen.findByRole('heading', { name: 'Pesée du jour' }, { timeout: 5000 })
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
  fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
  await screen.findByRole('button', { name: 'Se connecter avec Google' })
  expect(await services.keys.load()).toBeNull()
  await signIn()
  await screen.findByRole('heading', { name: 'Coffre verrouillé' })
}, 15_000)
