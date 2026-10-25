import { POIDS_HABITUEL, type AvisPlausibilite } from '../../core/analyse'
import { formatFixed } from './format'

/** Texte d'un avis de plausibilité : factuel, sans jugement. */
export function messageAvis(avis: AvisPlausibilite): string {
  if (avis.type === 'horsHabituel') {
    return `Valeur inhabituelle (hors ${POIDS_HABITUEL.min} – ${POIDS_HABITUEL.max} kg).`
  }
  const sens = avis.sens === 'dessus' ? 'de plus' : 'de moins'
  return `${formatFixed(avis.ecartKg)} kg ${sens} que ta tendance (${formatFixed(avis.reference)} kg).`
}
