import { HORIZON_PROJECTION_JOURS } from './constantes'
import { ajouterJours } from './dates'
import { quantileStudent } from './student'
import type { PointProjection, Rythme } from './types'

/**
 * Tendance attendue sur les `jours` qui suivent `depuis` (spec § 4.4), avec des fourchettes
 * à 95 % et 99 % qui s'élargissent linéairement : quantiles de Student à n − 2 degrés de
 * liberté (D36). `null` si le rythme est inconnu ou stable.
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
  const ddl = rythme.nbPesees - 2
  const [t95, t99] = [quantileStudent(95, ddl), quantileStudent(99, ddl)]
  return Array.from({ length: jours }, (_, i) => {
    const h = i + 1
    const centre = tendanceActuelle + pente * h
    const [m95, m99] = [t95, t99].map((t) => t * rythme.erreurKgParJour * h)
    return {
      date: ajouterJours(depuis, h),
      centre,
      bas: centre - m95,
      haut: centre + m95,
      bas99: centre - m99,
      haut99: centre + m99,
    }
  })
}
