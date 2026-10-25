import { z } from 'zod'
import { PERIODS } from '../pesees/periodes'
import type { Unsubscribe } from '../types'

export const AUTO_LOCK_CHOICES = [1, 2, 5, 10, 15, 30] as const

/**
 * Préférences d'affichage, propres à l'appareil. Rien de secret ici : jamais de clé,
 * de phrase ni de donnée de santé.
 */
export const preferencesSchema = z.object({
  /** Verrouillage automatique après inactivité (D12). */
  autoLockMinutes: z.number().int().min(1).max(60).catch(5),
  chart: z
    .object({
      period: z.enum(PERIODS).catch('90j'),
      /** Axe des poids qui part de 0 (sinon : zoom sur l'intervalle des valeurs). */
      fromZero: z.boolean().catch(false),
    })
    .catch({ period: '90j', fromZero: false }),
})

export type Preferences = z.infer<typeof preferencesSchema>

/** Valeurs par défaut ; toute valeur invalide ou manquante y revient. */
export function parsePreferences(raw: unknown): Preferences {
  return preferencesSchema.parse(raw && typeof raw === 'object' ? raw : {})
}

export interface PreferencesStore {
  get(): Preferences
  set(preferences: Preferences): void
  /** Appelé immédiatement avec les préférences courantes, puis à chaque changement. */
  watch(listener: (preferences: Preferences) => void): Unsubscribe
}
