import { useMemo } from 'react'
import {
  JOURS_VARIATION,
  MIN_PESEES_RYTHME,
  calculerProjection,
  calculerRythme,
  calculerTendance,
  calculerVariation,
  calculerImc,
  categorieImc,
  dateLocale,
  estimerObjectif,
  peseesDansFenetre,
  type Mesure,
} from '../../core/analyse'
import type { Pesee } from '../../core/pesees'
import type { Profil } from '../../core/profil'

/** Assemble les calculs de core/analyse pour le tableau de bord (aucun calcul ici). */
export function useAnalyse(pesees: Pesee[], profil: Profil | null = null) {
  return useMemo(() => {
    const aujourdhui = dateLocale()
    const mesures: Mesure[] = [...pesees]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, poids }) => ({ date, poids }))
    const tendance = calculerTendance(mesures)
    const actuelle = tendance.at(-1)
    const rythme = calculerRythme(mesures, aujourdhui)
    return {
      aujourdhui,
      mesures,
      tendance,
      actuelle,
      rythme,
      peseesManquantes: Math.max(
        0,
        MIN_PESEES_RYTHME - peseesDansFenetre(mesures, aujourdhui).length,
      ),
      variation: calculerVariation(tendance, aujourdhui, JOURS_VARIATION),
      projection: actuelle ? calculerProjection(actuelle.tendance, rythme, actuelle.date) : null,
      profil,
      objectif: estimerObjectif(profil, tendance, rythme, aujourdhui),
      // IMC sur la tendance, pas sur la pesée du jour (moins de bruit).
      imc:
        actuelle && profil?.taille
          ? (() => {
              const valeur = calculerImc(actuelle.tendance, profil.taille)
              return { valeur, categorie: categorieImc(valeur) }
            })()
          : null,
    }
  }, [pesees, profil])
}

export type Analyse = ReturnType<typeof useAnalyse>
