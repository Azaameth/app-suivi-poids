/**
 * IMC adulte (D46) : poids / taille², mêmes seuils pour tous. Catégories de l'OMS ;
 * la borne haute de chaque catégorie est exclue (25,0 → surpoids).
 */
export const CATEGORIES_IMC = [
  { jusqua: 18.5, libelle: 'maigreur' },
  { jusqua: 25, libelle: 'corpulence normale' },
  { jusqua: 30, libelle: 'surpoids' },
  { jusqua: 35, libelle: 'obésité modérée' },
  { jusqua: 40, libelle: 'obésité sévère' },
  { jusqua: Infinity, libelle: 'obésité massive' },
] as const

export type CategorieImc = (typeof CATEGORIES_IMC)[number]['libelle']

export function calculerImc(poidsKg: number, tailleCm: number): number {
  const metres = tailleCm / 100
  return poidsKg / (metres * metres)
}

export function categorieImc(imc: number): CategorieImc {
  return CATEGORIES_IMC.find((c) => imc < c.jusqua)!.libelle
}

export interface BandeImc {
  categorie: CategorieImc
  /** Rang de la catégorie, de 0 (maigreur) à 5 (obésité massive). */
  rang: number
  /** Bornes en kg pour cette taille ; `null` : pas de borne de ce côté. */
  minKg: number | null
  maxKg: number | null
}

/** Catégories converties en kg pour une taille : fond du graphique, comme un carnet de santé. */
export function bandesImc(tailleCm: number): BandeImc[] {
  const metres2 = (tailleCm / 100) ** 2
  return CATEGORIES_IMC.map((c, rang) => ({
    categorie: c.libelle,
    rang,
    minKg: rang === 0 ? null : CATEGORIES_IMC[rang - 1].jusqua * metres2,
    maxKg: Number.isFinite(c.jusqua) ? c.jusqua * metres2 : null,
  }))
}

export interface SeuilImc {
  imc: number
  kg: number
}

/**
 * Prochain palier IMC dans le sens de l'objectif, pour borner l'axe du graphique : sous la
 * tendance pour « perdre », au-dessus pour « gagner », les deux bornes de la catégorie
 * actuelle pour « maintenir ». Vide s'il n'y a pas de palier de ce côté.
 */
export function palierImc(
  usage: 'perdre' | 'gagner' | 'maintenir',
  tendanceKg: number,
  tailleCm: number,
): SeuilImc[] {
  const metres2 = (tailleCm / 100) ** 2
  const imc = tendanceKg / metres2
  const seuils = CATEGORIES_IMC.map((c) => c.jusqua).filter(Number.isFinite)
  const dessous = seuils.filter((s) => s < imc).at(-1)
  const dessus = seuils.find((s) => s > imc)
  const choisis = usage === 'perdre' ? [dessous] : usage === 'gagner' ? [dessus] : [dessous, dessus]
  return choisis
    .filter((s): s is number => s !== undefined)
    .map((s) => ({ imc: s, kg: s * metres2 }))
}
