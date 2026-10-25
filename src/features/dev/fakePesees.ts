import { localDate, type PeseeInput } from '../../core/pesees'

const NOTES = [
  'après le footing',
  'repas de famille hier',
  'bien dormi',
  'mal dormi',
  'séance de muscu',
  'restaurant hier soir',
  'journée vélo',
  'un peu malade',
]

/** Générateur pseudo-aléatoire à graine (mulberry32) : mêmes données à chaque génération. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Un an de pesées fictives jusqu'à aujourd'hui : tendance de 82 à 76 kg, bruit journalier,
 * un peu plus lourd le lundi, ~20 % de jours sans pesée, une note de temps en temps.
 */
export function fakePesees(days = 365, today = new Date()): PeseeInput[] {
  const rand = random(42)
  const result: PeseeInput[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    if (rand() < 0.2) continue
    const progress = (days - 1 - i) / (days - 1)
    const trend = 82 - 6 * progress + Math.sin(progress * Math.PI * 4) * 0.8
    const monday = day.getDay() === 1 ? 0.4 : 0
    const poids = Math.round((trend + monday + (rand() - 0.5) * 0.8) * 10) / 10
    const note = rand() < 0.12 ? NOTES[Math.floor(rand() * NOTES.length)] : undefined
    result.push({ date: localDate(day), poids, ...(note && { note }) })
  }
  return result
}
