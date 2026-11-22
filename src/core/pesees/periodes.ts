import { ajouterJours, dateLocale, ecartJours } from '../analyse/dates'
import type { Pesee } from './model'

export const PERIODS = ['7j', '30j', '90j', '1an', 'tout'] as const
export type Period = (typeof PERIODS)[number]

/** Largeur de chaque période, en jours (aujourd'hui compris). */
export const PERIOD_DAYS: Record<Exclude<Period, 'tout'>, number> = {
  '7j': 7,
  '30j': 30,
  '90j': 90,
  '1an': 365,
}

/**
 * Pesées de la période qui se termine le jour `today` (compris), de la plus ancienne à la plus
 * récente. `today` peut être dans le passé : c'est la fenêtre d'un graphique qu'on fait glisser.
 */
export function filterByPeriod(pesees: Pesee[], period: Period, today = dateLocale()): Pesee[] {
  const sorted = [...pesees].sort((a, b) => a.date.localeCompare(b.date))
  if (period === 'tout') return sorted
  const from = ajouterJours(today, -(PERIOD_DAYS[period] - 1))
  return sorted.filter((p) => p.date >= from && p.date <= today)
}

/**
 * Jusqu'où remonter dans le temps (en jours avant aujourd'hui) pour que la fenêtre commence à
 * la première pesée. 0 pour « Tout » ou sans pesée.
 */
export function decalageMax(pesees: Pesee[], period: Period, aujourdhui: string): number {
  if (period === 'tout' || !pesees.length) return 0
  const premiere = pesees.reduce((min, p) => (p.date < min ? p.date : min), pesees[0].date)
  return Math.max(0, ecartJours(premiere, aujourdhui) - (PERIOD_DAYS[period] - 1))
}
