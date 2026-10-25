// Constantes de la restitution (docs/spec-restitution.md § 3). Décisions du registre :
// ne pas les modifier sans le proposer explicitement (D30, D31).

/** Moyenne mobile exponentielle : poids de la nouvelle pesée pour un écart d'un jour. */
export const FACTEUR_LISSAGE = 0.1
/** Fenêtre de la régression du rythme, aujourd'hui compris. */
export const FENETRE_RYTHME_JOURS = 28
/** En dessous : rythme et projection masqués. */
export const MIN_PESEES_RYTHME = 14
/** |rythme| < seuil → « stable ». */
export const SEUIL_STABLE_KG_SEMAINE = 0.1
/** 4 semaines. */
export const HORIZON_PROJECTION_JOURS = 28
/** Largeur de la fourchette en erreurs-types (≈ intervalle à 95 %). */
export const T_FOURCHETTE = 2
/** [À VALIDER] v1.1 : au-delà, pas de date d'objectif affichée (question Q1). */
export const HORIZON_MAX_OBJECTIF_JOURS = 90
/** v1.1 : tolérance de la zone « maintenir », en kg. */
export const TOLERANCE = { defaut: 1.0, min: 0.5, max: 3.0, pas: 0.5 } as const
/** Variation affichée sur le tableau de bord. */
export const JOURS_VARIATION = 30
