import { FACTEUR_LISSAGE } from './constantes'
import { ecartJours } from './dates'
import type { Mesure, PointTendance } from './types'

/**
 * Moyenne mobile exponentielle ajustée aux jours manquants (spec § 4.1) : après `g` jours
 * sans pesée, la nouvelle pèse comme `g` jours de lissage. Un point par pesée.
 */
export function calculerTendance(pesees: Mesure[]): PointTendance[] {
  const points: PointTendance[] = []
  for (const [i, pesee] of pesees.entries()) {
    if (i === 0) {
      points.push({ date: pesee.date, tendance: pesee.poids })
      continue
    }
    const precedent = points[i - 1]
    const g = Math.max(1, ecartJours(precedent.date, pesee.date))
    const alpha = 1 - (1 - FACTEUR_LISSAGE) ** g
    points.push({
      date: pesee.date,
      tendance: precedent.tendance + alpha * (pesee.poids - precedent.tendance),
    })
  }
  return points
}
