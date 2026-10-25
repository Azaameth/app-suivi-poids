import { FENETRE_RYTHME_JOURS, MIN_PESEES_RYTHME, SEUIL_STABLE_KG_SEMAINE } from './constantes'
import { ajouterJours, ecartJours } from './dates'
import type { Mesure, Rythme } from './types'

/** Pesées des `FENETRE_RYTHME_JOURS` derniers jours, aujourd'hui compris. */
export function peseesDansFenetre(pesees: Mesure[], aujourdhui: string): Mesure[] {
  const debut = ajouterJours(aujourdhui, -(FENETRE_RYTHME_JOURS - 1))
  return pesees.filter((p) => p.date >= debut && p.date <= aujourdhui)
}

/**
 * Régression linéaire (moindres carrés) sur les poids bruts de la fenêtre (spec § 4.2).
 * `null` s'il y a moins de `MIN_PESEES_RYTHME` pesées.
 */
export function calculerRythme(pesees: Mesure[], aujourdhui: string): Rythme | null {
  const fenetre = peseesDansFenetre(pesees, aujourdhui)
  const n = fenetre.length
  if (n < MIN_PESEES_RYTHME) return null

  const xs = fenetre.map((p) => ecartJours(fenetre[0].date, p.date))
  const ys = fenetre.map((p) => p.poids)
  const xMoy = xs.reduce((s, x) => s + x, 0) / n
  const yMoy = ys.reduce((s, y) => s + y, 0) / n
  const sxx = xs.reduce((s, x) => s + (x - xMoy) ** 2, 0)
  const sxy = xs.reduce((s, x, i) => s + (x - xMoy) * (ys[i] - yMoy), 0)
  const pente = sxy / sxx
  const ordonnee = yMoy - pente * xMoy
  const scr = xs.reduce((s, x, i) => s + (ys[i] - (ordonnee + pente * x)) ** 2, 0)
  const erreurPente = Math.sqrt(scr / (n - 2)) / Math.sqrt(sxx)

  const kgParSemaine = pente * 7
  return {
    kgParSemaine,
    erreurKgParJour: erreurPente,
    stable: Math.abs(kgParSemaine) < SEUIL_STABLE_KG_SEMAINE,
    nbPesees: n,
  }
}
