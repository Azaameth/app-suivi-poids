import { ajouterJours, dateLocale } from '../analyse/dates'
import type { Pesee } from './model'

export const PERIODS = ['7j', '30j', '90j', '1an', 'tout'] as const
export type Period = (typeof PERIODS)[number]

const PERIOD_DAYS: Record<Exclude<Period, 'tout'>, number> = {
  '7j': 7,
  '30j': 30,
  '90j': 90,
  '1an': 365,
}

/** Pesées de la période (aujourd'hui compris), de la plus ancienne à la plus récente. */
export function filterByPeriod(pesees: Pesee[], period: Period, today = dateLocale()): Pesee[] {
  const sorted = [...pesees].sort((a, b) => a.date.localeCompare(b.date))
  if (period === 'tout') return sorted
  const from = ajouterJours(today, -(PERIOD_DAYS[period] - 1))
  return sorted.filter((p) => p.date >= from)
}
