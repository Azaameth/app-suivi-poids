import { fireEvent, render, screen } from '@testing-library/react'
import { App } from '../App'
import { createMemoryServices } from '../adapters/memory'
import { ServicesProvider } from '../context/ServicesProvider'
import type { Services } from '../core'

/** Outils communs aux tests de l'interface (services en mémoire, parcours fréquents). */

export const PHRASE = 'cheval agrafe batterie'

export function renderApp(services: Services = createMemoryServices(), autoLockMs?: number) {
  render(
    <ServicesProvider services={services}>
      <App autoLockMs={autoLockMs} />
    </ServicesProvider>,
  )
  return services
}

export function fill(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** Ouvre le menu du profil puis clique sur `action` (« Se déconnecter », « 🔒 Verrouiller »…). */
export function menuProfil(action: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Profil de Test' }))
  fireEvent.click(screen.getByRole('button', { name: action }))
}

export async function signIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Google' }))
  await screen.findByRole('button', { name: 'Profil de Test' })
}

/** Premier lancement : création du coffre, jusqu'à l'écran des pesées. */
export async function createVault() {
  await screen.findByRole('heading', { name: 'Choisis ta phrase secrète' })
  fill('Phrase secrète', PHRASE)
  fill('Confirmation', PHRASE)
  fireEvent.click(screen.getByRole('button', { name: 'Créer mon coffre' }))
  await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
}
