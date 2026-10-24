import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { App } from './App'
import { createMemoryServices } from './adapters/memory'
import { ServicesProvider } from './context/ServicesProvider'
import type { Services } from './core'

afterEach(cleanup)

function renderApp(services: Services = createMemoryServices()) {
  render(
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>,
  )
  return services
}

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
