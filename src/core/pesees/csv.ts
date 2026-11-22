import type { Pesee } from './model'

/** Début de texte qu'un tableur prendrait pour une formule (injection CSV, OWASP). */
const DEBUT_FORMULE = /^[=+\-@\t\r]/

/**
 * - `standard` (D28) : RFC 4180, virgule, point décimal. Format de sauvegarde, réimportable.
 * - `excel-fr` : point-virgule et virgule décimale, ce qu'attend un tableur réglé en français
 *   (Excel l'ouvre en colonnes au double-clic). Se réimporte aussi tel quel.
 */
export type FormatCsv = 'standard' | 'excel-fr'

const SEPARATEUR: Record<FormatCsv, string> = { standard: ',', 'excel-fr': ';' }

function csvField(value: string, separateur: string): string {
  // Neutralisée par une apostrophe, que l'import retire (lireCsv).
  const sur = DEBUT_FORMULE.test(value) ? `'${value}` : value
  const aProteger = new RegExp(`["${separateur}\\r\\n]`)
  return aProteger.test(sur) ? `"${sur.replaceAll('"', '""')}"` : sur
}

/**
 * Export CSV du plus ancien au plus récent, dates `AAAA-MM-JJ`. BOM UTF-8 pour qu'Excel
 * affiche correctement les accents (D28).
 */
export function toCsv(pesees: Pesee[], format: FormatCsv = 'standard'): string {
  const sep = SEPARATEUR[format]
  const poids = (p: Pesee) =>
    format === 'excel-fr' ? String(p.poids).replace('.', ',') : String(p.poids)
  const rows = [...pesees]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [p.date, poids(p), csvField(p.note ?? '', sep)].join(sep))
  return '\uFEFF' + [['date', 'poids_kg', 'note'].join(sep), ...rows].join('\r\n') + '\r\n'
}
