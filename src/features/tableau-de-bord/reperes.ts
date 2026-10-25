import { ecartJours } from '../../core/analyse'

export type Repere = { date: string; type: 'annee' | 'trimestre' | 'mois' }

/**
 * Repères verticaux du graphique, adaptés à la durée affichée pour ne jamais surcharger :
 * mois (≤ 4 mois), trimestres (≤ 2 ans), années au-delà. Le 1ᵉʳ janvier est toujours une année.
 * Bornes exclues : un repère sur le bord n'apporte rien.
 */
export function reperesTemporels(debut: string, fin: string): Repere[] {
  const duree = ecartJours(debut, fin)
  const pasMois = duree <= 125 ? 1 : duree <= 730 ? 3 : 12
  const reperes: Repere[] = []
  let [annee, mois] = debut.split('-').map(Number)
  // Premier jour de mois strictement après `debut`.
  mois += 1
  for (;;) {
    if (mois > 12) {
      annee += Math.floor((mois - 1) / 12)
      mois = ((mois - 1) % 12) + 1
    }
    const date = `${annee}-${String(mois).padStart(2, '0')}-01`
    if (date >= fin) break
    if ((mois - 1) % pasMois === 0) {
      reperes.push({ date, type: mois === 1 ? 'annee' : pasMois === 1 ? 'mois' : 'trimestre' })
    }
    mois += 1
  }
  return reperes
}
