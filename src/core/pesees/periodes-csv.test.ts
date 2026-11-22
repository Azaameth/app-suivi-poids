import { dateLocale } from '../analyse'
import { describe, expect, test } from 'vitest'
import { decalageMax, filterByPeriod, toCsv, type Pesee } from '.'
import { parsePreferences } from '../prefs/Preferences'

const p = (date: string, poids: number, note?: string): Pesee => ({
  date,
  poids,
  ...(note !== undefined && { note }),
  createdAt: 0,
  updatedAt: 0,
})

describe('statistiques', () => {
  test('dateLocale utilise le fuseau local, pas UTC', () => {
    expect(dateLocale(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  test('filtre par période, du plus ancien au plus récent', () => {
    const pesees = [
      p('2026-10-24', 72),
      p('2025-10-01', 80),
      p('2026-09-25', 74),
      p('2026-07-27', 76),
    ]
    const dates = (period: Parameters<typeof filterByPeriod>[1]) =>
      filterByPeriod(pesees, period, '2026-10-24').map((x) => x.date)
    // 30 j = le jour même et les 29 précédents : le 2026-09-25 est inclus.
    expect(dates('7j')).toEqual(['2026-10-24'])
    expect(dates('30j')).toEqual(['2026-09-25', '2026-10-24'])
    expect(dates('90j')).toEqual(['2026-07-27', '2026-09-25', '2026-10-24'])
    expect(dates('tout')).toEqual(['2025-10-01', '2026-07-27', '2026-09-25', '2026-10-24'])
  })

  test('fenêtre décalée dans le passé : bornée des deux côtés', () => {
    const pesees = [p('2026-10-24', 72), p('2026-09-25', 74), p('2026-09-20', 75)]
    expect(filterByPeriod(pesees, '7j', '2026-09-26').map((x) => x.date)).toEqual([
      '2026-09-20',
      '2026-09-25',
    ])
  })

  test('décalage maximal : la fenêtre s’arrête à la première pesée', () => {
    const pesees = [p('2026-10-24', 72), p('2026-07-27', 76)]
    // 89 jours entre les deux : une fenêtre de 30 j peut reculer de 89 − 29 = 60 jours.
    expect(decalageMax(pesees, '30j', '2026-10-24')).toBe(60)
    expect(decalageMax(pesees, '1an', '2026-10-24')).toBe(0)
    expect(decalageMax(pesees, 'tout', '2026-10-24')).toBe(0)
    expect(decalageMax([], '7j', '2026-10-24')).toBe(0)
  })

  test('CSV : BOM, en-tête, tri, guillemets autour des notes à virgule ou guillemets', () => {
    const csv = toCsv([p('2026-10-24', 72.4, 'après le "footing", fatigué'), p('2026-10-23', 73)])
    expect(csv).toBe(
      '\uFEFFdate,poids_kg,note\r\n' +
        '2026-10-23,73,\r\n' +
        '2026-10-24,72.4,"après le ""footing"", fatigué"\r\n',
    )
  })
})

describe('préférences', () => {
  test('valeurs par défaut et valeurs invalides ramenées au défaut', () => {
    expect(parsePreferences(null)).toEqual({
      autoLockMinutes: 5,
      theme: 'systeme',
      horsLigne: true,
      chart: { period: '90j', fromZero: false, imc: true },
    })
    expect(
      parsePreferences({
        autoLockMinutes: 0,
        theme: 'violet',
        chart: { period: '2ans', fromZero: true },
      }),
    ).toEqual({
      autoLockMinutes: 5,
      theme: 'systeme',
      horsLigne: true,
      chart: { period: '90j', fromZero: true, imc: true },
    })
  })
})
