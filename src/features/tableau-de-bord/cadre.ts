import { ajouterJours, bandesImc, jourEnMs, zoneMaintien, type SeuilImc } from '../../core/analyse'
import type { Pesee } from '../../core/pesees'
import type { Analyse } from './useAnalyse'

// Repère SVG ; le graphique s'adapte à la largeur de l'écran (viewBox).
export const W = 360
export const H = 220
export const M = { top: 12, right: 12, bottom: 26, left: 40 }
export const PLOT_W = W - M.left - M.right
export const PLOT_H = H - M.top - M.bottom

/** Fenêtre affichée et moyens de la déplacer (absent pour « Tout »). */
export interface Navigation {
  decalage: number
  max: number
  jours: number
  deplacer: (decalage: number) => void
}

/** Graduations du poids et bornes de l'axe vertical. */
export interface Echelle {
  ticks: number[]
  min: number
  max: number
}

/** Graduations « rondes » (pas de 0,5 / 1 / 2 / 5 kg…) qui encadrent les valeurs. */
export function niceScale(low: number, high: number, target = 4): Echelle {
  const span = Math.max(high - low, 1)
  const raw = span / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  const min = Math.max(0, Math.floor(low / step) * step)
  const max = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 100) / 100)
  return { ticks, min, max: max > min ? max : min + step }
}

export interface EntreeCadre {
  /** Pesées de la fenêtre (au moins 2). */
  visibles: Pesee[]
  analyse: Analyse
  fromZero: boolean
  paliers: SeuilImc[]
  imc: boolean
  /** Dernier jour de la fenêtre (aujourd'hui, ou plus tôt après un glissement). */
  finFenetre: string
  navigation: Navigation | null
}

/**
 * Tout ce que le tracé doit savoir, sans rien dessiner : fenêtre de dates, séries visibles,
 * objectif, échelle des poids et conversions vers le repère SVG. `echelleFigee` (pendant un
 * glissement) remplace l'échelle calculée, pour que la courbe défile sans « sauter ».
 */
export function cadreGraphique(entree: EntreeCadre, echelleFigee: Echelle | null = null) {
  const { visibles, analyse, fromZero, paliers, imc, finFenetre, navigation } = entree
  const enDirect = !navigation || navigation.decalage === 0
  // Fenêtre fixe (période décalable), mais jamais avant la toute première pesée : un historique
  // plus court que la période occupe toute la largeur au lieu d'être tassé à droite.
  // « Tout » : de la première à la dernière pesée.
  const premiere = analyse.mesures[0]?.date ?? visibles[0].date
  const debutPeriode = navigation ? ajouterJours(finFenetre, -(navigation.jours - 1)) : premiere
  const debut = navigation && debutPeriode < premiere ? premiere : debutPeriode
  const tendance = analyse.tendance.filter((p) => p.date >= debut && p.date <= finFenetre)
  // La projection part d'aujourd'hui : seulement quand la fenêtre l'inclut.
  const projection = enDirect ? (analyse.projection ?? []) : []
  const derniere = tendance.at(-1) ?? analyse.tendance.at(-1)!

  const fin = projection.at(-1)?.date ?? (navigation ? finFenetre : visibles.at(-1)!.date)
  const [xMin, xMax] = [jourEnMs(debut), jourEnMs(fin)]
  const valeurs = [
    ...visibles.map((p) => p.poids),
    ...tendance.map((p) => p.tendance),
    ...projection.flatMap((p) => [p.bas99, p.haut99]),
  ]
  // Objectif (v1.1) : ligne de cible, ou zone pour « maintenir ». Inclus dans l'échelle s'il
  // est proche des données ; trop loin, un repère au bord du graphique l'indique.
  const { profil } = analyse
  const cible = profil?.usage && profil.cible !== undefined ? profil.cible : null
  const zone =
    cible !== null && profil?.usage === 'maintenir' ? zoneMaintien(cible, profil.tolerance) : null
  const [dataMin, dataMax] = [Math.min(...valeurs), Math.max(...valeurs)]
  const portee = Math.max(5, dataMax - dataMin)
  const cibleProche = cible !== null && cible >= dataMin - portee && cible <= dataMax + portee
  const bornesObjectif = !cibleProche ? [] : zone ? [zone.bas, zone.haut] : [cible!]
  const seuilsAxe = fromZero ? paliers.map((p) => p.kg) : []
  const echelle =
    echelleFigee ??
    niceScale(
      fromZero && paliers.length === 0 ? 0 : Math.min(dataMin, ...bornesObjectif, ...seuilsAxe),
      Math.max(dataMax, ...bornesObjectif, ...seuilsAxe),
    )
  const { min: yMin, max: yMax } = echelle

  const x = (day: string) => M.left + ((jourEnMs(day) - xMin) / (xMax - xMin || 1)) * PLOT_W
  const y = (kg: number) => M.top + (1 - (kg - yMin) / (yMax - yMin)) * PLOT_H
  const pt = (day: string, kg: number) => `${x(day).toFixed(1)},${y(kg).toFixed(1)}`
  const borne = (kg: number) => Math.min(yMax, Math.max(yMin, kg))
  /** Jour situé à la fraction `f` (0 à 1) de la largeur du tracé. */
  const jourA = (f: number) => new Date(xMin + f * (xMax - xMin)).toISOString().slice(0, 10)
  // Bandes de corpulence (carnet de santé) : seulement la partie visible.
  const bandes =
    imc && profil?.taille
      ? bandesImc(profil.taille)
          .map((b) => ({ ...b, haut: borne(b.maxKg ?? yMax), bas: borne(b.minKg ?? yMin) }))
          .filter((b) => b.haut > b.bas)
      : []
  const dateTicks = [0, 1 / 3, 2 / 3, 1].map(jourA)

  return {
    debut,
    fin,
    tendance,
    projection,
    derniere,
    cible,
    zone,
    cibleProche,
    echelle,
    bandes,
    dateTicks,
    x,
    y,
    pt,
    borne,
    jourA,
  }
}

export type Cadre = ReturnType<typeof cadreGraphique>
