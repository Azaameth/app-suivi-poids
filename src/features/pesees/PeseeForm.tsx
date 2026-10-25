import { useState, type FormEvent } from 'react'
import {
  InvalidPeseeError,
  NOTE_MAX,
  POIDS_MAX,
  POIDS_MIN,
  localDate,
  type Pesee,
  type PeseeRepository,
} from '../../core/pesees'
import { formatDay } from './format'

/**
 * Saisie d'une pesée (une par jour). Une date déjà saisie remplace la pesée existante ;
 * `editing` pré-remplit le formulaire depuis l'historique.
 */
export function PeseeForm({
  pesees,
  repo,
  editing,
  onDone,
}: {
  pesees: Pesee[]
  repo: PeseeRepository
  editing?: Pesee
  onDone?: () => void
}) {
  const [date, setDate] = useState(editing?.date ?? localDate())
  const [poids, setPoids] = useState(editing ? String(editing.poids) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const existing = pesees.find((p) => p.date === date)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const value = Number(poids.replace(',', '.').trim())
    if (poids.trim() === '' || Number.isNaN(value)) {
      return setMessage({ kind: 'error', text: 'Indique un poids, par exemple 72,4.' })
    }
    try {
      const trimmed = note.trim()
      const { synced } = await repo.save(
        { date, poids: value, ...(trimmed && { note: trimmed }) },
        existing,
      )
      synced.catch(() =>
        setMessage({ kind: 'error', text: 'Le serveur a refusé l’enregistrement. Réessaie.' }),
      )
      setMessage({ kind: 'ok', text: `Pesée du ${formatDay(date)} enregistrée.` })
      setPoids('')
      setNote('')
      onDone?.()
    } catch (error) {
      const text =
        error instanceof InvalidPeseeError
          ? `Pesée invalide : poids entre ${POIDS_MIN} et ${POIDS_MAX} kg, note de ${NOTE_MAX} caractères au plus.`
          : 'Enregistrement impossible.'
      setMessage({ kind: 'error', text })
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{editing ? 'Modifier la pesée' : 'Nouvelle pesée'}</h2>
      <label>
        Date
        <input
          type="date"
          value={date}
          max={localDate()}
          required
          disabled={Boolean(editing)}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        Poids (kg)
        <input
          type="text"
          inputMode="decimal"
          placeholder="72,4"
          value={poids}
          onChange={(e) => setPoids(e.target.value)}
        />
      </label>
      <label>
        Note (facultative)
        <textarea
          maxLength={NOTE_MAX}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {existing && !editing && (
        <p className="hint">Une pesée existe déjà ce jour : elle sera remplacée.</p>
      )}
      <div className="row">
        <button type="submit">{editing ? 'Enregistrer' : 'Ajouter'}</button>
        {editing && (
          <button type="button" onClick={onDone}>
            Annuler
          </button>
        )}
      </div>
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </form>
  )
}
