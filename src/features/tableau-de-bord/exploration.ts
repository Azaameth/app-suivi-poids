import { ecartJours } from '../../core/analyse'
import type { Pesee } from '../../core/pesees'

/** Au-delà de ce déplacement (px) avant l'appui long, le geste est un glissement. */
export const SEUIL_GLISSEMENT_PX = 8
/** Durée d'un appui long (ms) : affiche le curseur de lecture. */
export const DUREE_APPUI_LONG_MS = 450

/**
 * Nouveau décalage (jours avant aujourd'hui) après un glissement de `dxPx` sur une zone de tracé
 * large de `largeurPx` qui montre `jours` jours. Glisser vers la droite remonte dans le temps,
 * comme si on tirait la courbe. Borné à [0, max].
 */
export function decalageApresGlissement(
  depart: number,
  dxPx: number,
  largeurPx: number,
  jours: number,
  max: number,
): number {
  if (largeurPx <= 0) return depart
  const decalage = Math.round(depart + (dxPx / largeurPx) * jours)
  return Math.min(max, Math.max(0, decalage))
}

/** Pesée la plus proche d'un jour (curseur de lecture) ; à égalité, la plus ancienne. */
export function peseeLaPlusProche(pesees: Pesee[], jour: string): Pesee | null {
  let meilleure: Pesee | null = null
  let ecart = Infinity
  for (const p of pesees) {
    const e = Math.abs(ecartJours(p.date, jour))
    if (e < ecart) {
      meilleure = p
      ecart = e
    }
  }
  return meilleure
}
