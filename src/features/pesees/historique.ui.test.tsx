import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { ajouterJours, dateLocale } from '../../core/analyse'
import { PESEES } from '../../core/pesees'
import { fill } from '../../test/appHarness'
import { addPesee, history, saisieDuJour, seed, start, tab } from '../../test/peseesHarness'

afterEach(cleanup)

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

describe('import CSV (#39)', () => {
  test('aperçu (nouvelles, différentes, ignorées) puis import chiffré', async () => {
    const services = await start()
    await seed(services, 1, () => 80)
    const today = dateLocale()
    const hier = ajouterJours(today, -1)
    await tab('Réglages')
    const csv = `date;poids\n${hier};80,5\n${today};79,5\nn'importe quoi;12\n`
    fireEvent.change(screen.getByLabelText('Choisir un fichier CSV'), {
      target: { files: [new File([csv], 'pesees.csv', { type: 'text/csv' })] },
    })
    const apercu = await screen.findByLabelText('Aperçu de l’import')
    expect(within(apercu).getByText(/2 pesée\(s\) reconnue\(s\)/)).toBeTruthy()
    expect(within(apercu).getByText('1 nouvelle(s)')).toBeTruthy()
    expect(within(apercu).getByText(/80 kg → 79,5 kg/)).toBeTruthy()
    expect(within(apercu).getByText(/ligne 4 : date illisible/)).toBeTruthy()

    // Par défaut, la pesée existante n'est pas remplacée.
    fireEvent.click(within(apercu).getByRole('button', { name: 'Importer 1 pesée(s)' }))
    await screen.findByText('1 pesée(s) importée(s) ✓')
    const stored = await services.data.get('uid-test', PESEES, hier)
    expect(String(stored?.poids)).toMatch(/^v1:/)

    await tab('Historique')
    const liste = history()
    expect(within(liste).getByText(/80,5 kg/)).toBeTruthy()
    expect(within(liste).getByText(/^80 kg/)).toBeTruthy()
  }, 20_000)
})
