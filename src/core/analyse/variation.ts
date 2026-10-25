import { ajouterJours } from './dates'
import type { PointTendance } from './types'

/**
 * Variation de la tendance sur `jours` (spec § 4.3) : tendance actuelle − dernier point à
 * J−`jours` ou avant. `null` si l'historique est trop court. Jamais sur les pesées brutes.
 */
export function calculerVariation(
  tendance: PointTendance[],
  aujourdhui: string,
  jours: number,
): number | null {
  const limite = ajouterJours(aujourdhui, -jours)
  const reference = tendance.findLast((p) => p.date <= limite)
  const actuelle = tendance.at(-1)
  if (!reference || !actuelle) return null
  return actuelle.tendance - reference.tendance
}
