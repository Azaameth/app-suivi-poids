import { zoneMaintien, type EtatObjectif, type ObjectifProfil } from '../../core/analyse'
import { formatDateArrondie, formatFixed } from '../commun/format'

/** Mois arrondis, au moins 1. */
const enMois = (jours: number) => Math.max(1, Math.round(jours / 30.44))

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Tuile « Projection » quand un objectif est défini (spec § 5.2). Jamais culpabilisant :
 * on décrit, on ne juge pas (§ 5.3). `null` pour `sansProfil` : la tuile garde l'affichage v1.
 */
export function texteObjectif(
  etat: EtatObjectif,
  profil: ObjectifProfil,
  aujourdhui: string,
  peseesManquantes: number,
): { valeur: string; detail?: string } | null {
  const cible = profil.cible === undefined ? '' : `${formatFixed(profil.cible)} kg`
  switch (etat.type) {
    case 'sansProfil':
      return null
    case 'atteint':
      return { valeur: 'Objectif atteint 🎉', detail: `Cible : ${cible}` }
    case 'donneesInsuffisantes':
      return {
        valeur: '—',
        detail: `Encore ${pluriel(peseesManquantes, 'pesée')} pour estimer la date`,
      }
    case 'stable':
      return { valeur: 'Pas de date estimable', detail: 'Rythme stable pour l’instant' }
    case 'mauvaisSens':
      return {
        valeur: 'Pas de date estimable',
        detail: `Au rythme actuel ; encore ${formatFixed(etat.ecartKg)} kg jusqu’à ${cible}`,
      }
    case 'date': {
      const court = (jour: string) => formatDateArrondie(jour, aujourdhui, true)
      const probable = formatDateArrondie(etat.probable, aujourdhui)
      if (etat.auPlusTard === null) {
        return {
          valeur: `Objectif au plus tôt ${formatDateArrondie(etat.auPlusTot, aujourdhui)}`,
          detail: `${cible} ; fourchette encore large`,
        }
      }
      const tot = court(etat.auPlusTot)
      const tard = court(etat.auPlusTard)
      return {
        valeur: `Objectif vers ${probable}`,
        detail: tot === tard ? cible : `${cible}, à 95 % : ${tot} – ${tard}`,
      }
    }
    case 'lointain': {
      const tot = enMois(etat.joursAuPlusTot)
      if (etat.joursAuPlusTard === null) {
        return { valeur: `Au plus tôt dans ${tot} mois`, detail: `${cible} ; fourchette large` }
      }
      const tard = enMois(etat.joursAuPlusTard)
      return {
        valeur: tot === tard ? `Dans ${tot} mois environ` : `Dans ${tot} à ${tard} mois`,
        detail: `${cible}, au rythme actuel (estimation lointaine)`,
      }
    }
    case 'dansZone': {
      const zone = zoneMaintien(profil.cible!, profil.tolerance)
      return {
        valeur:
          etat.depuisJours === 0
            ? 'Dans la zone depuis aujourd’hui'
            : `Dans la zone depuis ${pluriel(etat.depuisJours, 'jour')}`,
        detail: `${formatFixed(zone.bas)} – ${formatFixed(zone.haut)} kg`,
      }
    }
    case 'horsZone': {
      const zone = zoneMaintien(profil.cible!, profil.tolerance)
      return {
        valeur: `${formatFixed(etat.ecartKg)} kg ${etat.sens === 'dessus' ? 'au-dessus' : 'en dessous'} de la zone`,
        detail: `Zone : ${formatFixed(zone.bas)} – ${formatFixed(zone.haut)} kg`,
      }
    }
  }
}
