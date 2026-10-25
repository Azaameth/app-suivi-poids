import { HORIZON_PROJECTION_JOURS, T_FOURCHETTE } from './constantes'
import { ajouterJours } from './dates'
import type { PointProjection, Rythme } from './types'

/**
 * Tendance attendue sur les `jours` qui suivent `depuis` (spec § 4.4), avec une fourchette
 * qui s'élargit linéairement. `null` si le rythme est inconnu ou stable.
 * Porte sur la tendance, pas sur une pesée future.
 */
export function calculerProjection(
  tendanceActuelle: number,
  rythme: Rythme | null,
  depuis: string,
  jours = HORIZON_PROJECTION_JOURS,
): PointProjection[] | null {
  if (!rythme || rythme.stable) return null
  const pente = rythme.kgParSemaine / 7
  return Array.from({ length: jours }, (_, i) => {
    const h = i + 1
    const centre = tendanceActuelle + pente * h
    const marge = T_FOURCHETTE * rythme.erreurKgParJour * h
    return { date: ajouterJours(depuis, h), centre, bas: centre - marge, haut: centre + marge }
  })
}
