import { expect, test } from 'vitest'
import { reperesTemporels } from './reperes'

test('90 jours : un repère par début de mois, bornes exclues', () => {
  expect(reperesTemporels('2026-07-28', '2026-10-25')).toEqual([
    { date: '2026-08-01', type: 'mois' },
    { date: '2026-09-01', type: 'mois' },
    { date: '2026-10-01', type: 'mois' },
  ])
})

test('1 an : trimestres, le 1ᵉʳ janvier marqué comme année', () => {
  expect(reperesTemporels('2025-10-26', '2026-10-25')).toEqual([
    { date: '2026-01-01', type: 'annee' },
    { date: '2026-04-01', type: 'trimestre' },
    { date: '2026-07-01', type: 'trimestre' },
    { date: '2026-10-01', type: 'trimestre' },
  ])
})

test('plus de 2 ans : années seulement', () => {
  expect(reperesTemporels('2023-03-15', '2026-10-25').map((r) => r.date)).toEqual([
    '2024-01-01',
    '2025-01-01',
    '2026-01-01',
  ])
})

test('7 jours sans changement de mois : aucun repère', () => {
  expect(reperesTemporels('2026-10-19', '2026-10-25')).toEqual([])
})
