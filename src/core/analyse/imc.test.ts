import { describe, expect, test } from 'vitest'
import { bandesImc, calculerImc, categorieImc, palierImc } from './imc'

describe('IMC (OMS, adulte)', () => {
  test('poids / taille²', () => {
    expect(calculerImc(70, 175)).toBeCloseTo(22.857, 3)
  })

  test('catégories, borne haute exclue', () => {
    expect(categorieImc(18.4)).toBe('maigreur')
    expect(categorieImc(18.5)).toBe('corpulence normale')
    expect(categorieImc(24.9)).toBe('corpulence normale')
    expect(categorieImc(25)).toBe('surpoids')
    expect(categorieImc(30)).toBe('obésité modérée')
    expect(categorieImc(35)).toBe('obésité sévère')
    expect(categorieImc(40)).toBe('obésité massive')
  })

  test('bandes en kg pour une taille, contiguës', () => {
    const bandes = bandesImc(180)
    expect(bandes).toHaveLength(6)
    expect(bandes[0]).toMatchObject({ categorie: 'maigreur', minKg: null })
    expect(bandes[1].minKg).toBeCloseTo(59.94, 2)
    expect(bandes[1].maxKg).toBeCloseTo(81, 2)
    expect(bandes[5]).toMatchObject({ categorie: 'obésité massive', maxKg: null })
    for (let i = 1; i < bandes.length; i++) expect(bandes[i].minKg).toBe(bandes[i - 1].maxKg)
  })
})

describe('palier IMC dans le sens de l’objectif', () => {
  // 180 cm : 18,5 → 59,94 kg ; 25 → 81 kg ; 30 → 97,2 kg.
  test('perdre : le seuil sous la tendance', () => {
    expect(palierImc('perdre', 85, 180)).toEqual([{ imc: 25, kg: expect.closeTo(81, 2) }])
  })

  test('gagner : le seuil au-dessus', () => {
    expect(palierImc('gagner', 85, 180)).toEqual([{ imc: 30, kg: expect.closeTo(97.2, 2) }])
  })

  test('maintenir : les deux bornes de la catégorie actuelle', () => {
    expect(palierImc('maintenir', 70, 180).map((s) => s.imc)).toEqual([18.5, 25])
  })

  test('tendance pile sur un seuil : le palier suivant', () => {
    expect(palierImc('perdre', 81, 180).map((s) => s.imc)).toEqual([18.5])
  })

  test('pas de palier de ce côté : vide (ou une seule borne)', () => {
    expect(palierImc('perdre', 55, 180)).toEqual([])
    expect(palierImc('gagner', 140, 180)).toEqual([])
    expect(palierImc('maintenir', 140, 180).map((s) => s.imc)).toEqual([40])
  })
})
