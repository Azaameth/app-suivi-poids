import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'
import { createMemoryServices } from '../adapters/memory'
import type { Services } from '../core'
import { ajouterJours, dateLocale } from '../core/analyse'
import { PeseeRepository } from '../core/pesees'
import { createVault, fill, renderApp, signIn } from './appHarness'

/** Parcours communs aux tests de l'interface des pesées (historique, tableau de bord, réglages). */

export async function start(services: Services = createMemoryServices()) {
  renderApp(services)
  await signIn()
  await createVault()
  return services
}

/** Change d'onglet et attend la fin du chargement à la demande de l'écran. */
export async function tab(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  await waitFor(() => expect(screen.queryByText(/^Chargement/)).toBeNull())
}

/** Ouvre la saisie du jour (bouton « + ») et renvoie la fenêtre. */
export async function saisieDuJour() {
  // Le bouton « + » n'apparaît qu'une fois les pesées chargées.
  fireEvent.click(await screen.findByRole('button', { name: 'Saisir la pesée du jour' }))
  return screen.getByRole('dialog', { name: 'Pesée du jour' })
}
export const history = () => screen.getByRole('list', { name: 'Historique des pesées' })
export const tuile = (name: string) => screen.getByRole('region', { name })

/** Saisie dans l'onglet Historique (date au choix). */
export async function addPesee(date: string, poids: string, note = '') {
  fill('Date', date)
  fill('Poids (kg)', poids)
  fill('Note (facultative)', note)
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
  const list = await screen.findByRole('list', { name: 'Historique des pesées' })
  await within(list).findByText(new RegExp(`${poids.replace('.', ',')} kg`))
}

/** Remplit directement le DataStore : `jours` pesées quotidiennes jusqu'à aujourd'hui. */
export async function seed(services: Services, jours: number, poids: (i: number) => number) {
  const key = await services.keys.load()
  const repo = new PeseeRepository(services.data, 'uid-test', key!)
  const today = dateLocale()
  for (let i = 0; i < jours; i++) {
    await repo.save({ date: ajouterJours(today, i - jours + 1), poids: poids(i) })
  }
}
