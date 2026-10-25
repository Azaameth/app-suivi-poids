// Dates au format `YYYY-MM-DD`. Les écarts se comptent en jours calendaires, à partir des
// chaînes (minuit UTC de chaque jour) : aucun piège de changement d'heure.

const JOUR_MS = 24 * 60 * 60 * 1000

/** Date locale de l'utilisateur (son fuseau, jamais UTC). Identifiant d'une pesée. */
export function dateLocale(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Jour `YYYY-MM-DD` → millisecondes à minuit UTC (axes, formatage ; jamais l'heure locale). */
export function jourEnMs(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number)
  return Date.UTC(a, m - 1, j)
}

/** Nombre de jours de `de` à `a` (négatif si `a` est avant `de`). */
export function ecartJours(de: string, a: string): number {
  return Math.round((jourEnMs(a) - jourEnMs(de)) / JOUR_MS)
}

export function ajouterJours(jour: string, n: number): string {
  return new Date(jourEnMs(jour) + n * JOUR_MS).toISOString().slice(0, 10)
}
