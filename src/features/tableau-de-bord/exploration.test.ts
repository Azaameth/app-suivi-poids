import { describe, expect, test } from 'vitest'
import type { Pesee } from '../../core/pesees'
import { decalageApresGlissement, peseeLaPlusProche } from './exploration'

const p = (date: string, poids = 70): Pesee => ({ date, poids, createdAt: 0, updatedAt: 0 })

describe('exploration du graphique', () => {
  test('glisser vers la droite remonte le temps, proportionnellement à la largeur', () => {
    // 300 px pour 90 jours : 100 px ≈ 30 jours.
    expect(decalageApresGlissement(0, 100, 300, 90, 500)).toBe(30)
    expect(decalageApresGlissement(30, -50, 300, 90, 500)).toBe(15)
  })

  test('borné : jamais dans le futur, jamais avant la première pesée', () => {
    expect(decalageApresGlissement(10, -300, 300, 90, 500)).toBe(0)
    expect(decalageApresGlissement(0, 3000, 300, 90, 120)).toBe(120)
    expect(decalageApresGlissement(5, 100, 0, 90, 120)).toBe(5)
  })

  test('pesée la plus proche du doigt', () => {
    const pesees = [p('2026-10-01'), p('2026-10-05'), p('2026-10-09')]
    expect(peseeLaPlusProche(pesees, '2026-10-06')?.date).toBe('2026-10-05')
    expect(peseeLaPlusProche(pesees, '2026-10-07')?.date).toBe('2026-10-05')
    expect(peseeLaPlusProche(pesees, '2026-12-01')?.date).toBe('2026-10-09')
    expect(peseeLaPlusProche([], '2026-10-01')).toBeNull()
  })
})
