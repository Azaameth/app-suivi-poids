import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ajouterJours, dateLocale } from '../../core/analyse'
import type { Pesee } from '../../core/pesees'
import type { Profil } from '../../core/profil'
import { M, PLOT_W, cadreGraphique, niceScale, type Navigation } from './cadre'
import { useAnalyse } from './useAnalyse'

const aujourdhui = dateLocale()

/** `jours` pesées quotidiennes jusqu'à aujourd'hui, de `depart` kg en baissant de `pente` kg/j. */
function pesees(jours: number, depart = 80, pente = 0.05): Pesee[] {
  return Array.from({ length: jours }, (_, i) => ({
    date: ajouterJours(aujourdhui, i - jours + 1),
    poids: Math.round((depart - pente * i) * 10) / 10,
    createdAt: 0,
    updatedAt: 0,
  }))
}

function cadre(liste: Pesee[], options: { profil?: Profil; navigation?: Navigation | null } = {}) {
  const analyse = renderHook(() => useAnalyse(liste, options.profil ?? null)).result.current
  const navigation =
    options.navigation === undefined
      ? { decalage: 0, max: 0, jours: 30, deplacer: () => {} }
      : options.navigation
  return cadreGraphique({
    visibles: liste,
    analyse,
    fromZero: false,
    paliers: [],
    imc: false,
    finFenetre: aujourdhui,
    navigation,
  })
}

describe('niceScale', () => {
  test('graduations rondes qui encadrent les valeurs', () => {
    expect(niceScale(71.3, 78.6)).toEqual({ ticks: [70, 72, 74, 76, 78, 80], min: 70, max: 80 })
    // Écart de moins de 1 kg : traité comme 1 kg, donc 4 pas de 0,25 kg.
    expect(niceScale(72.1, 72.4).ticks).toEqual([72, 72.25, 72.5])
  })

  test('jamais sous 0, et un intervalle même pour une valeur unique', () => {
    expect(niceScale(0, 80).min).toBe(0)
    const plat = niceScale(70, 70)
    expect(plat.max).toBeGreaterThan(plat.min)
  })
})

describe('cadreGraphique', () => {
  test('historique plus court que la période : la fenêtre commence à la première pesée', () => {
    const liste = pesees(10)
    const c = cadre(liste)
    expect(c.debut).toBe(liste[0].date)
    expect(c.x(liste[0].date)).toBe(M.left)
  })

  test('fenêtre en direct : projection incluse, la fin de l’axe est celle de la projection', () => {
    const c = cadre(pesees(40))
    expect(c.projection.length).toBeGreaterThan(0)
    expect(c.fin).toBe(c.projection.at(-1)!.date)
    expect(c.x(c.fin)).toBeCloseTo(M.left + PLOT_W)
  })

  test('fenêtre passée : pas de projection', () => {
    const c = cadre(pesees(40), {
      navigation: { decalage: 5, max: 10, jours: 30, deplacer: () => {} },
    })
    expect(c.projection).toEqual([])
    expect(c.fin).toBe(aujourdhui)
  })

  test('objectif proche : inclus dans l’échelle ; lointain : signalé au bord, hors échelle', () => {
    const base = { usage: 'perdre' as const, updatedAt: 0 }
    const proche = cadre(pesees(40), { profil: { ...base, cible: 74 } })
    expect(proche.cibleProche).toBe(true)
    expect(proche.echelle.min).toBeLessThanOrEqual(74)

    const lointain = cadre(pesees(40), { profil: { ...base, cible: 50 } })
    expect(lointain.cibleProche).toBe(false)
    expect(lointain.echelle.min).toBeGreaterThan(50)
  })

  test('maintenir : une zone autour de la cible, pas de ligne', () => {
    const c = cadre(pesees(40, 75, 0), {
      profil: { usage: 'maintenir', cible: 75, tolerance: 1, updatedAt: 0 },
    })
    expect(c.zone).toEqual({ bas: 74, haut: 76 })
  })

  test('échelle figée (glissement) : remplace celle calculée', () => {
    const analyse = renderHook(() => useAnalyse(pesees(40), null)).result.current
    const figee = { ticks: [0, 100], min: 0, max: 100 }
    const c = cadreGraphique(
      {
        visibles: pesees(40),
        analyse,
        fromZero: false,
        paliers: [],
        imc: false,
        finFenetre: aujourdhui,
        navigation: null,
      },
      figee,
    )
    expect(c.echelle).toBe(figee)
  })
})
