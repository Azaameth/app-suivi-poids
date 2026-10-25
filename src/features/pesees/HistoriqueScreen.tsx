import { useState } from 'react'
import type { Pesee, PeseeRepository } from '../../core/pesees'
import { PeseeForm } from './PeseeForm'
import { PeseeList } from './PeseeList'

/** Historique : saisie à une date au choix, liste, modification, suppression. */
export function HistoriqueScreen({
  pesees,
  repo,
  onRemove,
}: {
  pesees: Pesee[]
  repo: PeseeRepository
  onRemove: (date: string) => void
}) {
  const [editing, setEditing] = useState<Pesee | undefined>()
  return (
    <>
      <PeseeForm
        key={editing?.date ?? 'nouvelle'}
        pesees={pesees}
        repo={repo}
        editing={editing}
        title={editing ? undefined : 'Ajouter une pesée'}
        onDone={() => setEditing(undefined)}
      />
      <PeseeList pesees={pesees} onEdit={setEditing} onRemove={onRemove} />
    </>
  )
}
