/** Pesée déchiffrée, réduite à ce qu'utilisent les calculs. Listes triées par date croissante. */
export interface Mesure {
  date: string
  poids: number
}

export interface PointTendance {
  date: string
  tendance: number
}

export interface Rythme {
  /** Pente de la régression × 7. */
  kgParSemaine: number
  /** Erreur-type de la pente, en kg par jour. */
  erreurKgParJour: number
  /** |kgParSemaine| < SEUIL_STABLE_KG_SEMAINE. */
  stable: boolean
  nbPesees: number
}

export interface PointProjection {
  date: string
  centre: number
  bas: number
  haut: number
}
