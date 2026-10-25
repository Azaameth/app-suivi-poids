import { dateLocale } from '../../core/analyse'
import type { Pesee, PeseeRepository } from '../../core/pesees'
import { formatWeight } from '../commun/format'
import { PeseeForm } from '../pesees/PeseeForm'

/** Ligne « Pesée du jour : X kg — Modifier » (spec § 5.4), ou invitation à saisir. */
export function PeseeDuJour({ pesees, onSaisir }: { pesees: Pesee[]; onSaisir: () => void }) {
  const duJour = pesees.find((p) => p.date === dateLocale())
  return (
    <p className="card row espace">
      {duJour ? (
        <span>
          Pesée du jour : <strong>{formatWeight(duJour.poids)}</strong>
        </span>
      ) : (
        <span className="hint">Pas encore de pesée aujourd’hui.</span>
      )}
      <button type="button" onClick={onSaisir}>
        {duJour ? 'Modifier' : 'Saisir'}
      </button>
    </p>
  )
}

/** Formulaire de la pesée du jour (date figée), pré-rempli si elle existe. Sans confirmation. */
export function SaisieDuJour({
  pesees,
  repo,
  onDone,
}: {
  pesees: Pesee[]
  repo: PeseeRepository
  onDone: () => void
}) {
  const duJour = pesees.find((p) => p.date === dateLocale())
  return (
    <PeseeForm pesees={pesees} repo={repo} editing={duJour} lockDate title="" onDone={onDone} />
  )
}
