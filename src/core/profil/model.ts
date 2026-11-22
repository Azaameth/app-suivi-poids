import { z } from 'zod'
import { TOLERANCE } from '../analyse/constantes'
import { POIDS_MAX, POIDS_MIN } from '../pesees/model'

/** Document `users/{uid}/meta/profil` (spec § 2, v1.1 ; D46). */
export const PROFIL_DOC = 'profil'

export const USAGES = ['perdre', 'gagner', 'maintenir'] as const
export type Usage = (typeof USAGES)[number]

/** Taille en centimètres : sert seulement à l'IMC (adulte, D46). */
export const TAILLE_CM = { min: 50, max: 250 } as const

/** Champs chiffrés : la cible et la taille sont des données de santé. */
export const PROFIL_ENCRYPTED_FIELDS = ['cible', 'taille'] as const

const encrypted = z.string().regex(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)
const timestamp = z.number().int().nonnegative()
const tolerance = z
  .number()
  .min(TOLERANCE.min)
  .max(TOLERANCE.max)
  .refine((t) => Number.isInteger(t / TOLERANCE.pas), `Par pas de ${TOLERANCE.pas} kg`)

/**
 * Profil en clair. `usage` null : pas d'objectif, affichage neutre (v1). Une cible est
 * exigée dès qu'il y a un usage ; la tolérance n'existe que pour « maintenir ».
 */
export const profilSchema = z
  .object({
    usage: z.enum(USAGES).nullable(),
    /** Poids visé, en kg (centre de la zone pour « maintenir »). */
    cible: z.number().gt(POIDS_MIN).max(POIDS_MAX).optional(),
    /** Demi-largeur de la zone « maintenir », en kg. */
    tolerance: tolerance.optional(),
    taille: z.number().min(TAILLE_CM.min).max(TAILLE_CM.max).optional(),
    updatedAt: timestamp,
  })
  .strict()
  .refine((p) => p.usage === null || p.cible !== undefined, 'Cible attendue avec un usage')
  .refine(
    (p) => p.tolerance === undefined || p.usage === 'maintenir',
    'Tolérance réservée à « maintenir »',
  )

/** Profil stocké : `cible` et `taille` chiffrées, le reste en clair (spec § 2). */
export const storedProfilSchema = z
  .object({
    usage: z.enum(USAGES).nullable(),
    cible: encrypted.optional(),
    tolerance: z.number().optional(),
    taille: encrypted.optional(),
    updatedAt: timestamp,
  })
  .strict()

export type Profil = z.infer<typeof profilSchema>
export type StoredProfil = z.infer<typeof storedProfilSchema>
/** Champs saisis ; l'horodatage est géré par le dépôt. */
export type ProfilInput = Omit<Profil, 'updatedAt'>

export const PROFIL_VIDE: ProfilInput = { usage: null }
