import { useMemo, useState } from 'react'
import { signalerImprobables } from '../../core/analyse'
import type { Pesee } from '../../core/pesees'
import { formatDay, formatWeight } from '../commun/format'
import { Icone } from '../commun/Icones'
import { MachimotoDit } from '../commun/Mascotte'
import { messageAvis } from '../commun/plausibilite'

/** Historique, de la plus récente à la plus ancienne. Suppression en deux temps. */
export function PeseeList({
  pesees,
  onEdit,
  onRemove,
}: {
  pesees: Pesee[]
  onEdit: (pesee: Pesee) => void
  onRemove: (date: string) => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const improbables = useMemo(
    () => signalerImprobables([...pesees].sort((a, b) => a.date.localeCompare(b.date))),
    [pesees],
  )

  if (pesees.length === 0) {
    return (
      <MachimotoDit taille={48}>
        <p>Aucune pesée pour l’instant. Ajoute la première ci-dessus.</p>
      </MachimotoDit>
    )
  }

  return (
    <ul className="history" aria-label="Historique des pesées">
      {pesees.map((p) => (
        <li key={p.date}>
          <div>
            <strong>{formatWeight(p.poids)}</strong>{' '}
            {improbables.has(p.date) && (
              <span
                className="avertissement"
                role="img"
                aria-label={`Saisie improbable : ${messageAvis(improbables.get(p.date)!)}`}
                title={`Saisie improbable : ${messageAvis(improbables.get(p.date)!)}`}
              >
                ⚠️
              </span>
            )}{' '}
            <span className="hint">{formatDay(p.date)}</span>
            {p.note && <p className="note">{p.note}</p>}
          </div>
          <div className="row">
            {confirming === p.date ? (
              <>
                <button type="button" className="danger-plein" onClick={() => onRemove(p.date)}>
                  Confirmer la suppression
                </button>
                <button type="button" onClick={() => setConfirming(null)}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="icone"
                  aria-label={`Modifier la pesée du ${formatDay(p.date)}`}
                  title="Modifier"
                  onClick={() => onEdit(p)}
                >
                  <Icone nom="stylo" />
                </button>
                <button
                  type="button"
                  className="icone danger-plein"
                  aria-label={`Supprimer la pesée du ${formatDay(p.date)}`}
                  title="Supprimer"
                  onClick={() => setConfirming(p.date)}
                >
                  <Icone nom="poubelle" />
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
