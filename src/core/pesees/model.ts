import { z } from 'zod'

/** Collection Firestore : `users/{uid}/pesees/{YYYY-MM-DD}`. */
export const PESEES = 'pesees'

export const POIDS_MIN = 0
export const POIDS_MAX = 5000
export const NOTE_MAX = 500

/** Champs chiffrés : jamais filtrés ni triés côté serveur (D16). */
export const PESEE_ENCRYPTED_FIELDS = ['poids', 'note'] as const

/** Valeur chiffrée au format `v1:<iv_b64>:<data_b64>` (voir core/crypto). */
export type Encrypted = `v1:${string}:${string}`

const encrypted = z
  .string()
  .regex(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/, 'Valeur chiffrée attendue (v1:<iv>:<data>)')
  .transform((value) => value as Encrypted)

/** Date du jour au format `YYYY-MM-DD` : sert aussi d'identifiant du document. */
const date = z.iso.date()

/** Millisecondes depuis l'epoch (pas de Timestamp Firestore : core/ reste indépendant). */
const timestamp = z.number().int().nonnegative()

/** Pesée en clair, telle que l'appli la manipule. */
export const peseeSchema = z
  .object({
    date,
    /** En kilogrammes. */
    poids: z.number().min(POIDS_MIN).max(POIDS_MAX),
    note: z.string().trim().min(1).max(NOTE_MAX).optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()
  .refine((p) => p.updatedAt >= p.createdAt, 'updatedAt antérieur à createdAt')

/** Pesée telle que stockée dans Firestore : `poids` et `note` chiffrés, le reste en clair. */
export const storedPeseeSchema = z
  .object({
    date,
    poids: encrypted,
    note: encrypted.optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()

export type Pesee = z.infer<typeof peseeSchema>
export type StoredPesee = z.infer<typeof storedPeseeSchema>
