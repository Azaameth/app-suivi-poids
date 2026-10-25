import { useState } from 'react'
import { localDate, type Pesee, type PeseeRepository } from '../../core/pesees'
import { PeseeForm } from '../pesees/PeseeForm'
import { formatWeight } from '../pesees/format'

/**
 * Pesée du jour (spec § 5.4) : si elle existe, « Pesée du jour : X kg — modifier » ouvre le
 * formulaire pré-rempli ; sinon, saisie directe. Pas de boîte de confirmation.
 */
export function SaisiePesee({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  const aujourdhui = localDate()
  const duJour = pesees.find((p) => p.date === aujourdhui)
  const [modification, setModification] = useState(false)

  if (duJour && !modification) {
    return (
      <p className="card row">
        <span>
          Pesée du jour : <strong>{formatWeight(duJour.poids)}</strong>
        </span>
        <button type="button" onClick={() => setModification(true)}>
          Modifier
        </button>
      </p>
    )
  }
  return (
    <PeseeForm
      key={duJour ? 'modification' : 'saisie'}
      pesees={pesees}
      repo={repo}
      editing={duJour}
      lockDate
      title={duJour ? 'Modifier la pesée du jour' : 'Pesée du jour'}
      onDone={() => setModification(false)}
    />
  )
}
