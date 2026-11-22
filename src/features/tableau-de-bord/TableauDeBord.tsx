import { JOURS_VARIATION, tonVariation } from '../../core/analyse'
import type { Pesee } from '../../core/pesees'
import type { Profil } from '../../core/profil'
import { formatFixed, formatSigned } from '../commun/format'
import { Mascotte } from '../commun/Mascotte'
import { GraphiquePesees } from './GraphiquePesees'
import { PeseeDuJour } from './SaisiePesee'
import { texteObjectif } from './objectifTexte'
import { Tuile } from './Tuile'
import { useAnalyse } from './useAnalyse'

/**
 * Tableau de bord (spec § 5) : 4 tuiles, graphique, pesée du jour. Couleurs neutres tant
 * qu'aucun objectif n'est défini (v1) ; avec un objectif, tuile Projection et accents (v1.1).
 */
export function TableauDeBord({
  pesees,
  profil = null,
  onSaisir,
  onFixerObjectif,
}: {
  pesees: Pesee[]
  profil?: Profil | null
  onSaisir: () => void
  onFixerObjectif?: () => void
}) {
  const analyse = useAnalyse(pesees, profil)
  const { actuelle, rythme, variation, projection, peseesManquantes, objectif, imc } = analyse

  if (!actuelle) {
    return (
      <>
        <section className="card vide">
          <Mascotte taille={96} expression="ravi" />
          <p>
            Bienvenue ! Saisis ta première pesée : la tendance, le rythme et la projection
            apparaîtront au fil des jours.
          </p>
          <button type="button" className="principal" onClick={onSaisir}>
            Saisir ma première pesée
          </button>
        </section>
      </>
    )
  }

  const encore = `Encore ${peseesManquantes} pesée${peseesManquantes > 1 ? 's' : ''} pour estimer`
  const fin = projection?.at(-1)
  const texte = profil && texteObjectif(objectif, profil, analyse.aujourdhui, peseesManquantes)
  const ton = (v: number | null, jours = 7) => tonVariation(profil, actuelle.tendance, v, jours)
  // La couleur ne porte jamais seule l'information (§ 5.3) : le sens est aussi écrit.
  const sens = (v: number | null, jours = 7) => {
    const t = ton(v, jours)
    return t === 'favorable' ? ' · vers l’objectif' : t === 'defavorable' ? ' · s’en éloigne' : ''
  }

  return (
    <>
      <div className="tuiles">
        <Tuile
          titre="Tendance"
          valeur={`${formatFixed(actuelle.tendance)} kg`}
          detail={imc ? `IMC ${formatFixed(imc.valeur)} · ${imc.categorie}` : undefined}
        />
        <Tuile
          titre="Rythme"
          valeur={rythme ? `${formatSigned(rythme.kgParSemaine, 2)} kg/sem` : '—'}
          detail={
            !rythme ? encore : rythme.stable ? 'Stable' : `sur 28 jours${sens(rythme.kgParSemaine)}`
          }
          ton={rythme && !rythme.stable ? ton(rythme.kgParSemaine) : null}
        />
        <Tuile
          titre="Sur 30 jours"
          valeur={variation === null ? '—' : `${formatSigned(variation, 1)} kg`}
          detail={
            variation === null
              ? 'Historique insuffisant'
              : sens(variation, JOURS_VARIATION).slice(3) || undefined
          }
          ton={ton(variation, JOURS_VARIATION)}
        />
        <Tuile
          titre={texte ? 'Objectif' : 'Projection'}
          valeur={
            texte
              ? texte.valeur
              : !rythme
                ? '—'
                : rythme.stable || !fin
                  ? 'Stable'
                  : `Dans 4 sem. : ${formatFixed(fin.centre)} kg`
          }
          detail={
            texte
              ? texte.detail
              : !rythme
                ? encore
                : fin && !rythme.stable
                  ? `Tendance attendue, à 95 % : ${formatFixed(fin.bas)} – ${formatFixed(fin.haut)}`
                  : undefined
          }
        />
      </div>
      {!profil?.usage && onFixerObjectif && (
        <p className="invitation-objectif">
          🎯 Pas encore d’objectif.{' '}
          <button type="button" className="lien" onClick={onFixerObjectif}>
            Fixer un objectif
          </button>
        </p>
      )}
      <GraphiquePesees pesees={pesees} analyse={analyse} />
      <PeseeDuJour pesees={pesees} onSaisir={onSaisir} />
    </>
  )
}
