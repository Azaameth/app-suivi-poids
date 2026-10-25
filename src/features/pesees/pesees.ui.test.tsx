import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { createMemoryServices } from '../../adapters/memory'
import type { MemoryFileExporter } from '../../adapters/memory/MemoryFileExporter'
import type { Services } from '../../core'
import { ajouterJours, dateLocale } from '../../core/analyse'
import { PESEES, PeseeRepository } from '../../core/pesees'
import { createVault, fill, renderApp, signIn } from '../../test/appHarness'

afterEach(cleanup)

async function start(services: Services = createMemoryServices()) {
  renderApp(services)
  await signIn()
  await createVault()
  return services
}

/** Change d'onglet et attend la fin du chargement à la demande de l'écran. */
async function tab(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  await waitFor(() => expect(screen.queryByText(/^Chargement/)).toBeNull())
}

/** Ouvre la saisie du jour (bouton « + ») et renvoie la fenêtre. */
async function saisieDuJour() {
  // Le bouton « + » n'apparaît qu'une fois les pesées chargées.
  fireEvent.click(await screen.findByRole('button', { name: 'Saisir la pesée du jour' }))
  return screen.getByRole('dialog', { name: 'Pesée du jour' })
}
const history = () => screen.getByRole('list', { name: 'Historique des pesées' })
const tuile = (name: string) => screen.getByRole('region', { name })

/** Saisie dans l'onglet Historique (date au choix). */
async function addPesee(date: string, poids: string, note = '') {
  fill('Date', date)
  fill('Poids (kg)', poids)
  fill('Note (facultative)', note)
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
  const list = await screen.findByRole('list', { name: 'Historique des pesées' })
  await within(list).findByText(new RegExp(`${poids.replace('.', ',')} kg`))
}

/** Remplit directement le DataStore : `jours` pesées quotidiennes jusqu'à aujourd'hui. */
async function seed(services: Services, jours: number, poids: (i: number) => number) {
  const key = await services.keys.load()
  const repo = new PeseeRepository(services.data, 'uid-test', key!)
  const today = dateLocale()
  for (let i = 0; i < jours; i++) {
    await repo.save({ date: ajouterJours(today, i - jours + 1), poids: poids(i) })
  }
}

describe('historique', () => {
  test('état vide, puis saisie (virgule acceptée) visible et stockée chiffrée', async () => {
    const services = await start()
    await tab('Historique')
    expect(screen.getByText(/Aucune pesée pour l’instant/)).toBeTruthy()

    await addPesee('2026-10-24', '72,4', 'après le footing')
    expect(within(history()).getByText('après le footing')).toBeTruthy()
    const stored = await services.data.get('uid-test', PESEES, '2026-10-24')
    expect(stored?.poids).toMatch(/^v1:/)
  }, 15_000)

  test('poids manquant ou hors bornes refusé', async () => {
    await start()
    await tab('Historique')
    fill('Poids (kg)', '')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Indique un poids/)
    fill('Poids (kg)', '6000')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/entre 0 et 5000 kg/)
  }, 15_000)

  test('même jour : avertissement puis remplacement (une seule pesée par jour)', async () => {
    await start()
    await tab('Historique')
    await addPesee('2026-10-24', '72.4')
    fill('Date', '2026-10-24')
    expect(screen.getByText(/elle sera remplacée/)).toBeTruthy()
    await addPesee('2026-10-24', '71.9')
    expect(within(history()).getAllByRole('listitem')).toHaveLength(1)
  }, 15_000)

  test('modifier puis supprimer depuis l’historique', async () => {
    await start()
    await tab('Historique')
    await addPesee('2026-10-24', '72.4')
    fireEvent.click(within(history()).getByRole('button', { name: /^Modifier la pesée du/ }))
    await screen.findByRole('heading', { name: 'Modifier la pesée' })
    fill('Poids (kg)', '70')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await within(history()).findByText('70 kg')

    fireEvent.click(within(history()).getByRole('button', { name: /^Supprimer la pesée du/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }))
    await screen.findByText(/Aucune pesée pour l’instant/)
  }, 15_000)
})

describe('tableau de bord', () => {
  test('état vide : invitation et saisie du jour, ni tuiles ni graphique', async () => {
    await start()
    expect(await screen.findByText(/Saisis ta première pesée/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Tendance' })).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  }, 15_000)

  test('pesée du jour : saisie, puis « Pesée du jour : X kg — modifier » pré-rempli', async () => {
    await start()
    const fenetre = await saisieDuJour()
    expect((within(fenetre).getByLabelText('Date') as HTMLInputElement).disabled).toBe(true)
    fill('Poids (kg)', '78,6')
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Ajouter' }))
    await screen.findByText('78,6 kg', { selector: 'strong' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/enregistrée ✓/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    const modif = screen.getByRole('dialog', { name: 'Pesée du jour' })
    expect((within(modif).getByLabelText('Poids (kg)') as HTMLInputElement).value).toBe('78.6')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  }, 15_000)

  test('peu de pesées : rythme et projection masqués, historique insuffisant', async () => {
    const services = await start()
    await seed(services, 5, () => 80)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText(
      'Encore 9 pesées pour estimer',
    )
    expect(within(tuile('Projection')).getByText('—')).toBeTruthy()
    expect(within(tuile('Sur 30 jours')).getByText('Historique insuffisant')).toBeTruthy()
  }, 15_000)

  test('40 jours de baisse régulière : tuiles, tendance, projection et cône', async () => {
    const services = await start()
    await seed(services, 40, (i) => 82 - 0.05 * i)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText('−0,35 kg/sem')
    expect(within(tuile('Sur 30 jours')).getByText(/^−1,\d kg$/)).toBeTruthy()
    expect(within(tuile('Projection')).getByText(/^Dans 4 sem\. : \d+,\d kg$/)).toBeTruthy()

    const chart = screen.getByRole('img', { name: /Tendance du/ })
    expect(chart.querySelector('path.tendance')?.getAttribute('d')).toMatch(/^M.+C/)
    expect(chart.querySelector('polyline.projection')).toBeTruthy()
    expect(chart.querySelectorAll('polygon.cone')).toHaveLength(2)
    expect(chart.querySelector('polygon.cone99')).toBeTruthy()
    // 40 jours + 4 semaines de projection : au moins un début de mois en repère.
    expect(chart.querySelectorAll('.repere line').length).toBeGreaterThan(0)
    // Période par défaut 90 j : les 40 pesées sont visibles.
    expect(chart.querySelectorAll('circle.pesee')).toHaveLength(40)

    await tab('7 j')
    expect(screen.getByRole('img').querySelectorAll('circle.pesee')).toHaveLength(7)
    fireEvent.click(screen.getByLabelText('Axe depuis 0'))
    expect(services.prefs.get().chart).toEqual({ period: '7j', fromZero: true })
  }, 20_000)

  test('poids stable : « Stable », pas de projection', async () => {
    const services = await start()
    await seed(services, 20, () => 80)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText('Stable')
    expect(within(tuile('Projection')).getByText('Stable')).toBeTruthy()
    expect(screen.getByRole('img').querySelector('polyline.projection')).toBeNull()
  }, 15_000)
})

describe('finitions (bloc 2.7)', () => {
  test('pesée avec note : point mis en évidence, note dans l’info-bulle, légende', async () => {
    const services = await start()
    const key = await services.keys.load()
    const repo = new PeseeRepository(services.data, 'uid-test', key!)
    const today = dateLocale()
    await repo.save({ date: ajouterJours(today, -2), poids: 80 })
    await repo.save({ date: ajouterJours(today, -1), poids: 79.6, note: 'repas de famille' })
    await repo.save({ date: today, poids: 79.4 })

    const chart = await screen.findByRole('img', { name: /Tendance du/ })
    const notes = chart.querySelectorAll('circle.pesee.note')
    expect(notes).toHaveLength(1)
    expect(notes[0].querySelector('title')?.textContent).toMatch(/79,6 kg — repas de famille/)
    expect(chart.querySelectorAll('circle.pesee')).toHaveLength(3)
    expect(screen.getByText(/pesée avec note/)).toBeTruthy()
  }, 15_000)

  test('historique : modifier et supprimer en icônes, avec un nom accessible', async () => {
    await start()
    await tab('Historique')
    await addPesee('2026-10-24', '72.4')
    const supprimer = within(history()).getByRole('button', { name: /^Supprimer la pesée du/ })
    expect(supprimer.className).toContain('danger-plein')
    expect(supprimer.getAttribute('title')).toBe('Supprimer')
  }, 15_000)

  test('thème : Système → Sombre → Clair, appliqué à <html> et mémorisé', async () => {
    const services = await start()
    await tab('Réglages')
    const html = document.documentElement
    expect(html.dataset.theme).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Sombre' }))
    expect(html.dataset.theme).toBe('sombre')
    expect(services.prefs.get().theme).toBe('sombre')
    fireEvent.click(screen.getByRole('button', { name: 'Clair' }))
    expect(html.dataset.theme).toBe('clair')
    fireEvent.click(screen.getByRole('button', { name: 'Système' }))
    expect(html.dataset.theme).toBeUndefined()
  }, 15_000)
})

describe('export et réglages', () => {
  test('export CSV en clair, via le FileExporter', async () => {
    const services = await start()
    await tab('Historique')
    await addPesee('2026-10-24', '72.4', 'footing')
    await tab('Réglages')
    fireEvent.click(screen.getByRole('button', { name: 'Exporter en CSV' }))
    await screen.findByText('1 pesée(s) exportée(s).')
    const [file] = (services.files as MemoryFileExporter).files
    expect(file.fileName).toMatch(/^machimoto-pesees-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(file.content).toContain('2026-10-24,72.4,footing')
  }, 15_000)

  test('délai de verrouillage réglable', async () => {
    const services = await start()
    await tab('Réglages')
    fireEvent.change(screen.getByLabelText(/Verrouillage automatique après/), {
      target: { value: '15' },
    })
    expect(services.prefs.get().autoLockMinutes).toBe(15)
  }, 15_000)
})

describe('outils de dev', () => {
  test('données fictives : un an, réalistes, reproductibles', async () => {
    const { fakePesees } = await import('../dev/fakePesees')
    const today = new Date(2026, 9, 24)
    const data = fakePesees(365, today)
    expect(data.length).toBeGreaterThan(250)
    expect(data.length).toBeLessThan(330)
    expect(data.at(-1)!.date <= '2026-10-24').toBe(true)
    expect(data.every((p) => p.poids > 70 && p.poids < 90)).toBe(true)
    expect(fakePesees(365, today)).toEqual(data)
  })

  test('scénario baisse régulière : remplace tout, rythme et projection visibles', async () => {
    const { fakeBaisseReguliere } = await import('../dev/fakePesees')
    const attendu = fakeBaisseReguliere().length
    await start()
    await tab('Réglages')
    fireEvent.click(screen.getByRole('button', { name: 'Générer un an de données fictives' }))
    await screen.findByText(/Génération : \d+ pesée/, undefined, { timeout: 10_000 })
    fireEvent.click(screen.getByRole('button', { name: 'Scénario : baisse régulière (90 j)' }))
    await screen.findByText(`Génération : ${attendu} pesée(s), synchronisé.`, undefined, {
      timeout: 10_000,
    })
    await tab('Tableau de bord')
    expect(within(tuile('Rythme')).getByText(/^−0,\d\d kg\/sem$/)).toBeTruthy()
    expect(screen.getByRole('img').querySelector('polygon.cone99')).toBeTruthy()
  }, 30_000)

  test('générer puis tout effacer', async () => {
    await start()
    await tab('Réglages')
    fireEvent.click(screen.getByRole('button', { name: 'Générer un an de données fictives' }))
    await screen.findByText(/Génération : \d+ pesée\(s\), synchronisé/, undefined, {
      timeout: 10_000,
    })
    await tab('Historique')
    expect(within(history()).getAllByRole('listitem').length).toBeGreaterThan(250)
    await tab('Réglages')
    fireEvent.click(screen.getByRole('button', { name: 'Tout effacer' }))
    await screen.findByText(/Effacement : \d+ pesée\(s\), synchronisé/)
  }, 30_000)
})

describe('saisies improbables (avertir sans bloquer)', () => {
  test('faute de frappe : avertissement pendant la frappe, enregistrement possible, ⚠️ dans l’historique', async () => {
    const services = await start()
    await seed(services, 10, () => 78.4)
    await tab('Historique')
    await screen.findByRole('list', { name: 'Historique des pesées' })

    fill('Date', dateLocale())
    fill('Poids (kg)', '87,4')
    expect(
      screen.getByText(/Saisie improbable : 9,0 kg de plus que ta tendance \(78,4 kg\)/),
    ).toBeTruthy()
    fill('Poids (kg)', '78,9')
    expect(screen.queryByText(/Saisie improbable/)).toBeNull()

    fill('Poids (kg)', '87,4')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    await within(history()).findByText('87,4 kg')
    expect(within(history()).getAllByRole('img', { name: /Saisie improbable/ })).toHaveLength(1)
  }, 20_000)

  test('valeur hors des habitudes : avertie même sans historique', async () => {
    await start()
    await saisieDuJour()
    fill('Poids (kg)', '450')
    expect(screen.getByText(/Valeur inhabituelle \(hors 20 – 300 kg\)/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Ajouter' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  }, 15_000)
})
