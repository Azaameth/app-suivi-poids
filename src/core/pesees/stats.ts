import type { Pesee } from './model'

export const PERIODS = ['30j', '90j', '1an', 'tout'] as const
export type Period = (typeof PERIODS)[number]

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS: Record<Exclude<Period, 'tout'>, number> = { '30j': 30, '90j': 90, '1an': 365 }

/** Date locale du jour au format `YYYY-MM-DD` (pas toISOString, qui est en UTC). */
export function localDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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

/**
 * Moyenne mobile : pour chaque pesée, moyenne des pesées des `days` derniers jours
 * (elle comprise). `pesees` doit être trié par date croissante.
 */
export function movingAverage(pesees: Pesee[], days = 7): { date: string; poids: number }[] {
  return pesees.map((p, i) => {
    const from = dayToMs(p.date) - (days - 1) * DAY_MS
    const window = pesees.slice(0, i + 1).filter((q) => dayToMs(q.date) >= from)
    const mean = window.reduce((sum, q) => sum + q.poids, 0) / window.length
    return { date: p.date, poids: Math.round(mean * 100) / 100 }
  })
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
