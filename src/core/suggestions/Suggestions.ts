import { z } from 'zod'
import type { DataStore } from '../data/DataStore'

/** Collection `users/{uid}/suggestions/{id}` : non chiffrée, lue par Maxime (D45). */
export const SUGGESTIONS = 'suggestions'
export const TEXTE_MIN = 10
export const TEXTE_MAX = 2000
export const TYPES_SUGGESTION = ['idee', 'probleme'] as const

export const suggestionSchema = z
  .object({
    type: z.enum(TYPES_SUGGESTION),
    texte: z.string().trim().min(TEXTE_MIN).max(TEXTE_MAX),
    version: z.string().min(1).max(32),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()

export type Suggestion = z.infer<typeof suggestionSchema>
export type SuggestionInput = Pick<Suggestion, 'type' | 'texte'>

export class InvalidSuggestionError extends Error {
  constructor() {
    super(`Suggestion invalide : de ${TEXTE_MIN} à ${TEXTE_MAX} caractères.`)
    this.name = 'InvalidSuggestionError'
  }
}

/** Envoi des suggestions d'un utilisateur, avec la version de l'appli. */
export class SuggestionRepository {
  private readonly data: DataStore
  private readonly uid: string
  private readonly version: string
  private readonly now: () => number

  constructor(data: DataStore, uid: string, version: string, now: () => number = Date.now) {
    this.data = data
    this.uid = uid
    this.version = version
    this.now = now
  }

  /** Comme les pesées (D23) : effet local immédiat, `synced` à la confirmation du serveur. */
  envoyer(input: SuggestionInput): { synced: Promise<void> } {
    const result = suggestionSchema.safeParse({
      ...input,
      version: this.version,
      createdAt: this.now(),
    })
    if (!result.success) throw new InvalidSuggestionError()
    return { synced: this.data.set(this.uid, SUGGESTIONS, crypto.randomUUID(), result.data) }
  }
}
