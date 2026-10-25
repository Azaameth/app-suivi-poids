import type { Pesee } from './model'

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * Export CSV (RFC 4180 : virgule, point décimal, guillemets si besoin), du plus ancien au
 * plus récent. BOM UTF-8 pour qu'Excel affiche correctement les accents (D28).
 */
export function toCsv(pesees: Pesee[]): string {
  const rows = [...pesees]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [p.date, String(p.poids), csvField(p.note ?? '')].join(','))
  return '﻿' + ['date,poids_kg,note', ...rows].join('\r\n') + '\r\n'
}
