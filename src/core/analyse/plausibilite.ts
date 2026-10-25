import { MAX_JOURS_REFERENCE, POIDS_HABITUEL, SEUIL_ECART_IMPROBABLE_KG } from './constantes'
import { ecartJours } from './dates'
import { calculerTendance } from './tendance'
import type { Mesure } from './types'

/** Avis sur une saisie improbable (D35) : on prévient, on ne bloque jamais. */
export type AvisPlausibilite =
  | { type: 'horsHabituel'; reference?: undefined }
  | { type: 'ecart'; sens: 'dessus' | 'dessous'; ecartKg: number; reference: number }

/**
 * Compare `poids` saisi pour `date` à la tendance des pesées **antérieures** (la pesée du
 * même jour, en cours de correction, est ignorée). `null` si la saisie est plausible.
 */
export function evaluerPlausibilite(
  poids: number,
  date: string,
  pesees: Mesure[],
): AvisPlausibilite | null {
  if (poids < POIDS_HABITUEL.min || poids > POIDS_HABITUEL.max) return { type: 'horsHabituel' }
  const anterieures = pesees.filter((p) => p.date < date)
  const derniere = calculerTendance(anterieures).at(-1)
  if (!derniere || ecartJours(derniere.date, date) > MAX_JOURS_REFERENCE) return null
  const ecart = poids - derniere.tendance
  if (Math.abs(ecart) <= SEUIL_ECART_IMPROBABLE_KG) return null
  return {
    type: 'ecart',
    sens: ecart > 0 ? 'dessus' : 'dessous',
    ecartKg: Math.abs(ecart),
    reference: derniere.tendance,
  }
}

/** Avis par date pour un historique trié par date croissante (pesées improbables seulement). */
export function signalerImprobables(pesees: Mesure[]): Map<string, AvisPlausibilite> {
  const avis = new Map<string, AvisPlausibilite>()
  for (const p of pesees) {
    const resultat = evaluerPlausibilite(p.poids, p.date, pesees)
    if (resultat) avis.set(p.date, resultat)
  }
  return avis
}
