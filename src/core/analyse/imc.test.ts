import { describe, expect, test } from 'vitest'
import { bandesImc, calculerImc, categorieImc } from './imc'

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
