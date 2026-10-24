import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import type { MemoryFileExporter } from '../../adapters/memory/MemoryFileExporter'
import { PESEES } from '../../core/pesees'
import { createVault, fill, renderApp, signIn } from '../../test/appHarness'

afterEach(cleanup)

async function start() {
  const services = renderApp()
  await signIn()
  await createVault()
  return services
}

async function addPesee(date: string, poids: string, note = '') {
  fill('Date', date)
  fill('Poids (kg)', poids)
  fill('Note (facultative)', note)
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
  await screen.findByText(new RegExp(`${poids.replace('.', ',')} kg`))
}

const history = () => screen.getByRole('list', { name: 'Historique des pesées' })

describe('journal', () => {
  test('état vide, puis saisie (virgule acceptée) visible dans l’historique, stockée chiffrée', async () => {
    const services = await start()
    expect(screen.getByText(/Aucune pesée pour l’instant/)).toBeTruthy()

    await addPesee('2026-10-24', '72,4', 'après le footing')
    expect(within(history()).getByText('après le footing')).toBeTruthy()
    const stored = await services.data.get('uid-test', PESEES, '2026-10-24')
    expect(stored?.poids).toMatch(/^v1:/)
  }, 15_000)

  test('poids manquant ou hors bornes refusé', async () => {
    await start()
    fill('Poids (kg)', '')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Indique un poids/)
    fill('Poids (kg)', '6000')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/entre 0 et 5000 kg/)
  }, 15_000)

  test('même jour : avertissement puis remplacement (une seule pesée par jour)', async () => {
    await start()
    await addPesee('2026-10-24', '72.4')
    fill('Date', '2026-10-24')
    expect(screen.getByText(/elle sera remplacée/)).toBeTruthy()
    await addPesee('2026-10-24', '71.9')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(1)
  }, 15_000)

  test('modifier depuis l’historique', async () => {
    await start()
    await addPesee('2026-10-24', '72.4')
    fireEvent.click(within(history()).getByRole('button', { name: 'Modifier' }))
    await screen.findByRole('heading', { name: 'Modifier la pesée' })
    fill('Poids (kg)', '70')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await within(history()).findByText('70 kg')
    expect(screen.getByRole('heading', { name: 'Nouvelle pesée' })).toBeTruthy()
  }, 15_000)

  test('supprimer en deux temps', async () => {
    await start()
    await addPesee('2026-10-24', '72.4')
    fireEvent.click(within(history()).getByRole('button', { name: 'Supprimer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }))
    await screen.findByText(/Aucune pesée pour l’instant/)
  }, 15_000)
})

describe('graphique', () => {
  test('rendu réglable : style, moyenne mobile, préférences mémorisées', async () => {
    const services = await start()
    fireEvent.click(screen.getByRole('button', { name: 'Graphique' }))
    expect(screen.getByText(/Pas assez de pesées/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Journal' }))
    // Dates récentes : visibles dans la période par défaut (90 j).
    const today = new Date()
    const day = (offset: number) =>
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset).toLocaleDateString(
        'sv-SE',
      )
    await addPesee(day(2), '73')
    await addPesee(day(1), '72.5')
    await addPesee(day(0), '72')

    fireEvent.click(screen.getByRole('button', { name: 'Graphique' }))
    const chart = screen.getByRole('img', { name: /Poids du/ })
    expect(chart.querySelectorAll('circle')).toHaveLength(3)
    expect(chart.querySelector('polyline.series')).toBeTruthy()
    expect(chart.querySelector('polyline.average')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Barres' }))
    expect(chart.querySelectorAll('rect.bar')).toHaveLength(3)
    expect(chart.querySelector('polyline.series')).toBeNull()

    fireEvent.click(screen.getByLabelText('Moyenne 7 j'))
    expect(chart.querySelector('polyline.average')).toBeNull()

    expect(services.prefs.get().chart).toMatchObject({ style: 'barres', average: false })
  }, 20_000)
})

describe('export et réglages', () => {
  test('export CSV en clair, via le FileExporter', async () => {
    const services = await start()
    await addPesee('2026-10-24', '72.4', 'footing')
    fireEvent.click(screen.getByRole('button', { name: 'Export & réglages' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))
    await screen.findByText('1 pesée(s) exportée(s).')
    const [file] = (services.files as MemoryFileExporter).files
    expect(file.fileName).toMatch(/^machimoto-pesees-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(file.content).toContain('2026-10-24,72.4,footing')
  }, 15_000)

  test('délai de verrouillage réglable', async () => {
    const services = createMemoryServices()
    renderApp(services)
    await signIn()
    await createVault()
    fireEvent.click(screen.getByRole('button', { name: 'Export & réglages' }))
    fireEvent.change(screen.getByLabelText(/Verrouillage automatique après/), {
      target: { value: '15' },
    })
    expect(services.prefs.get().autoLockMinutes).toBe(15)
  }, 15_000)
})
