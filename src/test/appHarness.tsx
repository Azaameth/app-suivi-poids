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

/** Premier lancement : création du coffre, jusqu'à l'écran des pesées. Renvoie le code de secours. */
export async function createVault(): Promise<string> {
  await screen.findByRole('heading', { name: 'Choisis ta phrase secrète' })
  fill('Phrase secrète', PHRASE)
  fill('Confirmation', PHRASE)
  fireEvent.click(screen.getByRole('button', { name: 'Créer mon coffre' }))
  return passerCodeSecours()
}

/** Écran « Ton code de secours » (D48) : le relève, confirme l'avoir rangé, continue. */
export async function passerCodeSecours(): Promise<string> {
  await screen.findByRole('heading', { name: 'Ton code de secours' }, { timeout: 5000 })
  const code = screen.getByLabelText('Code de secours').textContent ?? ''
  fireEvent.click(screen.getByLabelText('J’ai rangé mon code en lieu sûr'))
  fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
  await screen.findByRole('heading', { name: 'Tableau de bord' }, { timeout: 5000 })
  return code
}
