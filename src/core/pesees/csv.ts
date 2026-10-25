import type { Pesee } from './model'

/** Début de texte qu'un tableur prendrait pour une formule (injection CSV, OWASP). */
const DEBUT_FORMULE = /^[=+\-@\t\r]/

function csvField(value: string): string {
  // Neutralisée par une apostrophe, que l'import retire (lireCsv).
  const sur = DEBUT_FORMULE.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(sur) ? `"${sur.replaceAll('"', '""')}"` : sur
}

/**
 * Export CSV (RFC 4180 : virgule, point décimal, guillemets si besoin), du plus ancien au
 * plus récent. BOM UTF-8 pour qu'Excel affiche correctement les accents (D28).
 */
export function toCsv(pesees: Pesee[]): string {
  const rows = [...pesees]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [p.date, String(p.poids), csvField(p.note ?? '')].join(','))
  return '\uFEFF' + ['date,poids_kg,note', ...rows].join('\r\n') + '\r\n'
}
