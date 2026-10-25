import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import {
  ajouterJours,
  calculerProjection,
  calculerRythme,
  calculerTendance,
  calculerVariation,
  dateLocale,
  ecartJours,
  peseesDansFenetre,
  type Mesure,
  type Rythme,
} from '.'

/** Pesées à partir d'un jour J0 : [[écart en jours, poids], …]. */
function serie(j0: string, points: [number, number][]): Mesure[] {
  return points.map(([j, poids]) => ({ date: ajouterJours(j0, j), poids }))
}

/** Une pesée par jour pendant `n` jours jusqu'à `fin`, poids = f(indice). */
function quotidien(fin: string, n: number, f: (i: number) => number): Mesure[] {
  return Array.from({ length: n }, (_, i) => ({ date: ajouterJours(fin, i - n + 1), poids: f(i) }))
}

describe('dates', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'Europe/Paris')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  test('saisie le 25/10/2026 à 0 h 30, heure de Paris → 2026-10-25', () => {
    // 0 h 30 à Paris (UTC+2 jusqu'à 3 h ce jour-là) = 22 h 30 UTC la veille.
    expect(dateLocale(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25')
  })

  test('écart autour du changement d’heure (25/10/2026) : des jours entiers', () => {
    expect(ecartJours('2026-10-24', '2026-10-26')).toBe(2)
    expect(ecartJours('2026-03-28', '2026-03-30')).toBe(2)
    expect(ajouterJours('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('tendance (moyenne mobile exponentielle)', () => {
  test('[80 (J0)] → 80', () => {
    expect(calculerTendance(serie('2026-10-01', [[0, 80]]))).toEqual([
      { date: '2026-10-01', tendance: 80 },
    ])
  })

  test('[80 (J0), 79 (J1)] → 79,9', () => {
    const t = calculerTendance(
      serie('2026-10-01', [
        [0, 80],
        [1, 79],
      ]),
    )
    expect(t[1].tendance).toBeCloseTo(79.9, 10)
  })

  test('[80 (J0), 79 (J3)] → alpha = 0,271 → 79,729', () => {
    const t = calculerTendance(
      serie('2026-10-01', [
        [0, 80],
        [3, 79],
      ]),
    )
    expect(t[1].tendance).toBeCloseTo(79.729, 10)
  })

  test('un point par pesée, aucun jour inventé', () => {
    expect(
      calculerTendance(
        serie('2026-10-01', [
          [0, 80],
          [5, 79],
          [9, 78],
        ]),
      ),
    ).toHaveLength(3)
  })
})

describe('rythme (régression sur 28 jours)', () => {
  const today = '2026-10-28'

  test('13 pesées sur 28 jours → null', () => {
    const pesees = Array.from({ length: 13 }, (_, i) => ({
      date: ajouterJours(today, -2 * i),
      poids: 80,
    })).reverse()
    expect(calculerRythme(pesees, today)).toBeNull()
  })

  test('28 pesées linéaires à −0,05 kg/jour → −0,35 kg/sem, erreurPente = 0', () => {
    const r = calculerRythme(
      quotidien(today, 28, (i) => 80 - 0.05 * i),
      today,
    )!
    expect(r.kgParSemaine).toBeCloseTo(-0.35, 10)
    expect(r.erreurKgParJour).toBeCloseTo(0, 10)
    expect(r).toMatchObject({ stable: false, nbPesees: 28 })
  })

  test('−0,08 kg/sem → stable', () => {
    const r = calculerRythme(
      quotidien(today, 28, (i) => 80 - (0.08 / 7) * i),
      today,
    )!
    expect(r.kgParSemaine).toBeCloseTo(-0.08, 10)
    expect(r.stable).toBe(true)
  })

  test('les pesées antérieures à la fenêtre sont ignorées', () => {
    const anciennes = quotidien(ajouterJours(today, -28), 30, () => 120)
    const recentes = quotidien(today, 28, (i) => 80 - 0.05 * i)
    const r = calculerRythme([...anciennes, ...recentes], today)!
    expect(r.nbPesees).toBe(28)
    expect(r.kgParSemaine).toBeCloseTo(-0.35, 10)
    expect(peseesDansFenetre([...anciennes, ...recentes], today)).toHaveLength(28)
  })
})

describe('variation sur 30 jours', () => {
  const today = '2026-10-28'

  test('historique de 20 jours → null', () => {
    const t = calculerTendance(quotidien(today, 20, () => 80))
    expect(calculerVariation(t, today, 30)).toBeNull()
  })

  test('calculée sur la tendance : une pesée aberrante le jour J n’est pas répercutée', () => {
    const pesees = quotidien(today, 40, () => 80)
    pesees[pesees.length - 1].poids = 90 // +10 kg brut, le jour même
    const variation = calculerVariation(calculerTendance(pesees), today, 30)!
    expect(variation).toBeCloseTo(1, 10) // alpha = 0,1 → +1 kg sur la tendance
    expect(variation).toBeLessThan(10)
  })
})

describe('projection (4 semaines)', () => {
  const rythme = (kgParSemaine: number, erreurKgParJour: number, stable = false): Rythme => ({
    kgParSemaine,
    erreurKgParJour,
    stable,
    nbPesees: 28,
  })

  test('rythme stable ou null → null', () => {
    expect(calculerProjection(80, null, '2026-10-28')).toBeNull()
    expect(calculerProjection(80, rythme(-0.05, 0.001, true), '2026-10-28')).toBeNull()
  })

  test('erreurPente = 0 → bas = haut = centre', () => {
    const p = calculerProjection(80, rythme(-0.35, 0), '2026-10-28')!
    expect(p).toHaveLength(28)
    for (const point of p) expect(point.bas).toBe(point.haut)
    expect(p[27]).toMatchObject({ date: '2026-11-25' })
    expect(p[27].centre).toBeCloseTo(78.6, 10)
  })

  test('la marge croît linéairement avec h', () => {
    const p = calculerProjection(80, rythme(-0.35, 0.01), '2026-10-28')!
    const marge = (h: number) => p[h - 1].haut - p[h - 1].centre
    expect(marge(1)).toBeCloseTo(0.02, 10)
    expect(marge(14)).toBeCloseTo(14 * marge(1), 10)
    expect(marge(28)).toBeCloseTo(28 * marge(1), 10)
  })
})
