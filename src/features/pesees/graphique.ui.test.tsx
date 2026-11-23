import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { ajouterJours, dateLocale } from '../../core/analyse'
import { PeseeRepository } from '../../core/pesees'
import { addPesee, history, seed, start, tab } from '../../test/peseesHarness'

afterEach(cleanup)

describe('graphique explorable', () => {
  test('flèches : remonter le temps, projection masquée, « Aujourd’hui » pour revenir', async () => {
    const services = await start()
    await seed(services, 120, (i) => 85 - 0.05 * i)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText(/kg\/sem/)
    const graphique = () => screen.getByRole('img', { name: /Tendance du/ })
    expect(graphique().querySelector('polyline.projection')).toBeTruthy()
    // Légende par couche.
    const legende = () => document.querySelector<HTMLElement>('.legende')!
    expect(within(legende()).getByText('Mesures')).toBeTruthy()
    expect(within(legende()).getByText('Projection')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '30 j' }))
    fireEvent.keyDown(graphique(), { key: 'ArrowLeft' })
    fireEvent.keyDown(graphique(), { key: 'ArrowLeft' })
    // 2 pas d'environ 8 jours : fenêtre passée, sans projection.
    expect(graphique().querySelector('polyline.projection')).toBeNull()
    expect(within(legende()).queryByText('Projection')).toBeNull()
    expect(screen.getByText(/^Du .+ au .+ \d{4}$/)).toBeTruthy()
    expect(graphique().querySelectorAll('circle.pesee')).toHaveLength(30)

    fireEvent.keyDown(graphique(), { key: 'Home' }) // au plus loin : première pesée
    fireEvent.keyDown(graphique(), { key: 'ArrowLeft' }) // bornée : pas avant la première
    expect(graphique().querySelectorAll('circle.pesee')).toHaveLength(30)

    fireEvent.click(screen.getByRole('button', { name: '↻ Aujourd’hui' }))
    expect(graphique().querySelector('polyline.projection')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '↻ Aujourd’hui' })).toBeNull()
  }, 20_000)

  test('historique plus court que la période : l’axe commence à la première pesée', async () => {
    const services = await start()
    await seed(services, 60, (i) => 90 - 0.1 * i)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText(/kg\/sem/)
    for (const periode of ['90 j', '1 an']) {
      fireEvent.click(screen.getByRole('button', { name: periode }))
      const cercles = screen
        .getByRole('img', { name: /Tendance du/ })
        .querySelectorAll<SVGCircleElement>('circle.pesee')
      // Première pesée au bord gauche de la zone de tracé (marge de 40), pas tassée à droite.
      expect(Number(cercles[0].getAttribute('cx'))).toBeCloseTo(40, 0)
    }
  }, 20_000)

  test('appui long : curseur de lecture avec la pesée et la tendance', async () => {
    const services = await start()
    await seed(services, 20, () => 80)
    await within(await screen.findByRole('region', { name: 'Rythme' })).findByText('Stable')
    const graphique = screen.getByRole('img', { name: /Tendance du/ })
    fireEvent.pointerDown(graphique, { pointerId: 1, pointerType: 'touch', clientX: 0 })
    await waitFor(() => expect(graphique.querySelector('.curseur')).toBeTruthy(), { timeout: 2000 })
    expect(within(graphique).getByText(/· 80 kg$/)).toBeTruthy()
    expect(within(graphique).getByText('tendance 80,0 kg')).toBeTruthy()
    fireEvent.pointerUp(graphique, { pointerId: 1, pointerType: 'touch' })
    expect(graphique.querySelector('.curseur')).toBeNull()
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
    expect(screen.getByText(/avec note/)).toBeTruthy()
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
