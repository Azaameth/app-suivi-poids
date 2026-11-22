import { HORIZON_MAX_OBJECTIF_JOURS, SEUIL_STABLE_KG_SEMAINE, TOLERANCE } from './constantes'
import { ajouterJours, ecartJours } from './dates'
import { quantileStudent } from './student'
import type { PointTendance, Rythme } from './types'

/** Ce que l'objectif retient du profil (core/profil), sans en dépendre. */
export interface ObjectifProfil {
  usage: 'perdre' | 'gagner' | 'maintenir' | null
  cible?: number
  tolerance?: number
}

/**
 * Union discriminée (spec § 4.5) : l'interface ne peut oublier aucun cas. `lointain` porte
 * aussi sa fourchette, en jours (Q1 : au-delà de l'horizon, une fourchette en mois plutôt
 * qu'une date précise).
 */
export type EtatObjectif =
  | { type: 'sansProfil' }
  | { type: 'atteint' }
  | { type: 'donneesInsuffisantes' }
  | { type: 'stable' }
  | { type: 'mauvaisSens'; ecartKg: number }
  | { type: 'lointain'; jours: number; joursAuPlusTot: number; joursAuPlusTard: number | null }
  | { type: 'date'; probable: string; auPlusTot: string; auPlusTard: string | null }
  | { type: 'dansZone'; depuisJours: number }
  | { type: 'horsZone'; sens: 'dessus' | 'dessous'; ecartKg: number }

/** Zone « maintenir » : [cible − tolérance, cible + tolérance]. */
export function zoneMaintien(cible: number, tolerance: number = TOLERANCE.defaut) {
  return { bas: cible - tolerance, haut: cible + tolerance }
}

/**
 * Où en est l'objectif, calculé sur la **tendance** (jamais sur une pesée brute).
 * Perdre / gagner : date probable = (cible − tendance) / pente, fourchette avec la pente
 * ± t × erreur (Student à 95 %, n − 2 ddl, D36). Maintenir : statut de zone.
 */
export function estimerObjectif(
  profil: ObjectifProfil | null,
  tendance: PointTendance[],
  rythme: Rythme | null,
  aujourdhui: string,
): EtatObjectif {
  if (!profil?.usage || profil.cible === undefined) return { type: 'sansProfil' }
  const derniere = tendance.at(-1)
  if (!derniere) return { type: 'donneesInsuffisantes' }
  const { cible } = profil
  const actuelle = derniere.tendance

  if (profil.usage === 'maintenir') {
    const zone = zoneMaintien(cible, profil.tolerance)
    const dedans = (t: number) => t >= zone.bas && t <= zone.haut
    if (actuelle > zone.haut)
      return { type: 'horsZone', sens: 'dessus', ecartKg: actuelle - zone.haut }
    if (actuelle < zone.bas)
      return { type: 'horsZone', sens: 'dessous', ecartKg: zone.bas - actuelle }
    let entree = derniere.date
    for (let i = tendance.length - 1; i >= 0 && dedans(tendance[i].tendance); i--) {
      entree = tendance[i].date
    }
    return { type: 'dansZone', depuisJours: ecartJours(entree, aujourdhui) }
  }

  const sens = profil.usage === 'perdre' ? -1 : 1
  if ((cible - actuelle) * sens <= 0) return { type: 'atteint' }
  if (!rythme) return { type: 'donneesInsuffisantes' }
  if (rythme.stable) return { type: 'stable' }
  const pente = rythme.kgParSemaine / 7
  if (pente * sens <= 0) return { type: 'mauvaisSens', ecartKg: Math.abs(cible - actuelle) }

  const marge = quantileStudent(95, rythme.nbPesees - 2) * rythme.erreurKgParJour
  const rapide = pente + sens * marge
  const lente = pente - sens * marge
  const ecart = cible - actuelle
  // Jours entiers, sans qu'un arrondi flottant (200,0000001) ne compte un jour de trop.
  const enJours = (pente_: number) => Math.ceil(ecart / pente_ - 1e-9)
  const jours = enJours(pente)
  const joursAuPlusTot = enJours(rapide)
  const joursAuPlusTard = lente * sens > 0 ? enJours(lente) : null

  if (jours > HORIZON_MAX_OBJECTIF_JOURS) {
    return { type: 'lointain', jours, joursAuPlusTot, joursAuPlusTard }
  }
  const depuis = derniere.date
  return {
    type: 'date',
    probable: ajouterJours(depuis, jours),
    auPlusTot: ajouterJours(depuis, joursAuPlusTot),
    auPlusTard: joursAuPlusTard === null ? null : ajouterJours(depuis, joursAuPlusTard),
  }
}

export type Ton = 'favorable' | 'defavorable'

/**
 * Couleurs liées à l'usage (spec § 5.3) : une variation va-t-elle vers l'objectif ? `null`
 * sans usage (palette neutre), dans la zone « maintenir », ou pour une variation trop faible
 * pour être lue : sous le seuil « stable », ramené à la durée considérée (`jours`).
 */
export function tonVariation(
  profil: ObjectifProfil | null,
  tendanceActuelle: number,
  variation: number | null,
  jours = 7,
): Ton | null {
  if (!profil?.usage || profil.cible === undefined || variation === null) return null
  if (Math.abs(variation) < (SEUIL_STABLE_KG_SEMAINE * jours) / 7) return null
  let sens: number
  if (profil.usage === 'perdre') sens = -1
  else if (profil.usage === 'gagner') sens = 1
  else {
    const zone = zoneMaintien(profil.cible, profil.tolerance)
    if (tendanceActuelle >= zone.bas && tendanceActuelle <= zone.haut) return null
    sens = tendanceActuelle > zone.haut ? -1 : 1
  }
  return variation * sens > 0 ? 'favorable' : 'defavorable'
}
