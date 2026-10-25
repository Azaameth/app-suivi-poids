import { dateLocale } from '../analyse/dates'
import type { Pesee } from './model'

export const PERIODS = ['7j', '30j', '90j', '1an', 'tout'] as const
export type Period = (typeof PERIODS)[number]

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS: Record<Exclude<Period, 'tout'>, number> = {
  '7j': 7,
  '30j': 30,
  '90j': 90,
  '1an': 365,
}

/** Date locale du jour au format `YYYY-MM-DD` (voir core/analyse/dates). */
export const localDate = dateLocale

/** Jour `YYYY-MM-DD` → millisecondes (minuit UTC : seul l'écart entre jours compte). */
export function dayToMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`)
}

/** Pesées de la période, triées de la plus ancienne à la plus récente. */
export function filterByPeriod(pesees: Pesee[], period: Period, today = localDate()): Pesee[] {
  const sorted = [...pesees].sort((a, b) => a.date.localeCompare(b.date))
  if (period === 'tout') return sorted
  const from = dayToMs(today) - (PERIOD_DAYS[period] - 1) * DAY_MS
  return sorted.filter((p) => dayToMs(p.date) >= from)
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * Export CSV (RFC 4180 : virgule, point décimal, guillemets si besoin), du plus ancien au
 * plus récent. BOM UTF-8 pour qu'Excel affiche correctement les accents.
 */
export function toCsv(pesees: Pesee[]): string {
  const rows = [...pesees]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [p.date, String(p.poids), csvField(p.note ?? '')].join(','))
  return '\uFEFF' + ['date,poids_kg,note', ...rows].join('\r\n') + '\r\n'
}
