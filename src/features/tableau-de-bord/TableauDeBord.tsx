import type { Pesee, PeseeRepository } from '../../core/pesees'
import { formatFixed, formatSigned } from '../commun/format'
import { GraphiquePesees } from './GraphiquePesees'
import { SaisiePesee } from './SaisiePesee'
import { Tuile } from './Tuile'
import { useAnalyse } from './useAnalyse'

/** Tableau de bord (spec § 5) : 4 tuiles, graphique, pesée du jour. Couleurs neutres (v1). */
export function TableauDeBord({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  const analyse = useAnalyse(pesees)
  const { actuelle, rythme, variation, projection, peseesManquantes } = analyse

  if (!actuelle) {
    return (
      <>
        <p className="hint">
          Bienvenue ! Saisis ta première pesée : la tendance, le rythme et la projection
          apparaîtront au fil des jours.
        </p>
        <SaisiePesee pesees={pesees} repo={repo} />
      </>
    )
  }

  const encore = `Encore ${peseesManquantes} pesée${peseesManquantes > 1 ? 's' : ''} pour estimer`
  const fin = projection?.at(-1)

  return (
    <>
      <div className="tuiles">
        <Tuile titre="Tendance" valeur={`${formatFixed(actuelle.tendance)} kg`} />
        <Tuile
          titre="Rythme"
          valeur={rythme ? `${formatSigned(rythme.kgParSemaine, 2)} kg/sem` : '—'}
          detail={!rythme ? encore : rythme.stable ? 'Stable' : 'sur 28 jours'}
        />
        <Tuile
          titre="Sur 30 jours"
          valeur={variation === null ? '—' : `${formatSigned(variation, 1)} kg`}
          detail={variation === null ? 'Historique insuffisant' : undefined}
        />
        <Tuile
          titre="Projection"
          valeur={
            !rythme
              ? '—'
              : rythme.stable || !fin
                ? 'Stable'
                : `Dans 4 sem. : ${formatFixed(fin.centre)} kg`
          }
          detail={
            !rythme
              ? encore
              : fin && !rythme.stable
                ? `Tendance attendue, à 95 % : ${formatFixed(fin.bas)} – ${formatFixed(fin.haut)}`
                : undefined
          }
        />
      </div>
      <GraphiquePesees pesees={pesees} analyse={analyse} />
      <SaisiePesee pesees={pesees} repo={repo} />
    </>
  )
}
