import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { history, start, tab, tuile } from '../../test/peseesHarness'

afterEach(cleanup)

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
