import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { fill } from '../../test/appHarness'
import { saisieDuJour, seed, start, tab, tuile } from '../../test/peseesHarness'

afterEach(cleanup)

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
    // Tableau de bord rempli : le graphique reste le héros, pas de Machimoto (bloc 2.10).
    expect(document.querySelector('main img.mascotte')).toBeNull()

    await tab('7 j')
    expect(screen.getByRole('img').querySelectorAll('circle.pesee')).toHaveLength(7)
    fireEvent.click(screen.getByLabelText('Axe depuis 0'))
    expect(services.prefs.get().chart).toEqual({ period: '7j', fromZero: true, imc: true })
  }, 20_000)

  test('poids stable : « Stable », pas de projection', async () => {
    const services = await start()
    await seed(services, 20, () => 80)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText('Stable')
    expect(within(tuile('Projection')).getByText('Stable')).toBeTruthy()
    expect(screen.getByRole('img').querySelector('polyline.projection')).toBeNull()
  }, 15_000)
})

describe('objectif (bloc 6.1)', () => {
  test('invitation, puis objectif « perdre » : tuile Objectif, IMC, accents et ligne de cible', async () => {
    const services = await start()
    await seed(services, 40, (i) => 82 - 0.05 * i)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText('−0,35 kg/sem')
    expect(tuile('Projection')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fixer un objectif' }))
    const carte = await screen.findByRole('region', { name: '🎯 Objectif' })
    fireEvent.click(within(carte).getByRole('button', { name: 'Perdre' }))
    fireEvent.change(within(carte).getByLabelText('Poids visé (kg)'), { target: { value: '78,5' } })
    fireEvent.change(within(carte).getByLabelText(/Taille/), { target: { value: '180' } })
    fireEvent.click(within(carte).getByRole('button', { name: 'Enregistrer' }))
    await screen.findByText('Objectif enregistré')

    // Stocké chiffré : ni la cible ni la taille ne sont lisibles.
    const brut = await services.data.get('uid-test', 'meta', 'profil')
    expect(brut).toMatchObject({ usage: 'perdre' })
    expect(JSON.stringify(brut)).not.toMatch(/78\.5|180/)

    await tab('Tableau de bord')
    const objectif = await screen.findByRole('region', { name: 'Objectif' })
    expect(within(objectif).getByText(/^Objectif vers (début |mi-|fin )/)).toBeTruthy()
    expect(
      within(tuile('Tendance')).getByText(/^IMC 2\d,\d · (corpulence normale|surpoids)$/),
    ).toBeTruthy()
    expect(tuile('Rythme').className).toContain('favorable')
    expect(within(tuile('Rythme')).getByText(/vers l’objectif/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Fixer un objectif' })).toBeNull()

    const chart = screen.getByRole('img', { name: /Tendance du/ })
    expect(chart.querySelector('.cible line')).toBeTruthy()
    expect(chart.querySelectorAll('.imc rect').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByLabelText('Repères IMC'))
    expect(screen.getByRole('img', { name: /Tendance du/ }).querySelector('.imc rect')).toBeNull()

    // Objectif + taille : l'axe descend jusqu'au prochain palier IMC (≈ 80 kg à 180 cm → IMC
    // 24,7 → 18,5, soit 59,9 kg), pas jusqu'à 0.
    fireEvent.click(screen.getByLabelText('Axe jusqu’à IMC 18,5'))
    expect(services.prefs.get().chart.fromZero).toBe(true)
    const graduations = [
      ...screen.getByRole('img', { name: /Tendance du/ }).querySelectorAll('.grid text'),
    ].map((t) => Number(t.textContent))
    expect(Math.min(...graduations)).toBeLessThanOrEqual(59.94)
    expect(Math.min(...graduations)).toBeGreaterThan(0)
  }, 20_000)

  test('maintenir : zone sur le graphique, statut de zone dans la tuile', async () => {
    const services = await start()
    await seed(services, 20, () => 70)
    await tab('Réglages')
    const carte = await screen.findByRole('region', { name: '🎯 Objectif' })
    fireEvent.click(within(carte).getByRole('button', { name: 'Maintenir' }))
    fireEvent.change(within(carte).getByLabelText('Poids à maintenir (kg)'), {
      target: { value: '70' },
    })
    fireEvent.change(within(carte).getByLabelText('Zone acceptée'), { target: { value: '1.5' } })
    fireEvent.click(within(carte).getByRole('button', { name: 'Enregistrer' }))
    await screen.findByText('Objectif enregistré')
    await tab('Tableau de bord')
    const objectif = await screen.findByRole('region', { name: 'Objectif' })
    expect(within(objectif).getByText('Dans la zone depuis 19 jours')).toBeTruthy()
    expect(within(objectif).getByText('68,5 – 71,5 kg')).toBeTruthy()
    expect(
      screen.getByRole('img', { name: /Tendance du/ }).querySelector('rect.zone-maintien'),
    ).toBeTruthy()
  }, 20_000)

  test('usage sans poids visé : refusé avec un message', async () => {
    await start()
    await tab('Réglages')
    const carte = await screen.findByRole('region', { name: '🎯 Objectif' })
    fireEvent.click(within(carte).getByRole('button', { name: 'Gagner' }))
    fireEvent.click(within(carte).getByRole('button', { name: 'Enregistrer' }))
    expect(within(carte).getByRole('alert').textContent).toMatch(/poids visé/)
  }, 15_000)
})
