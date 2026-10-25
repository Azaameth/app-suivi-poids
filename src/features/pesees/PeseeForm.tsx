import { useMemo, useState, type FormEvent } from 'react'
import {
  InvalidPeseeError,
  NOTE_MAX,
  POIDS_MAX,
  POIDS_MIN,
  type Pesee,
  type PeseeRepository,
} from '../../core/pesees'
import { dateLocale, evaluerPlausibilite } from '../../core/analyse'
import { formatDay } from '../commun/format'
import { messageAvis } from '../commun/plausibilite'
import { useToast } from '../shell/toast'

/**
 * Saisie d'une pesée (une par jour). Une date déjà saisie remplace la pesée existante ;
 * `editing` pré-remplit le formulaire depuis l'historique.
 */
export function PeseeForm({
  pesees,
  repo,
  editing,
  lockDate = false,
  title,
  onDone,
}: {
  pesees: Pesee[]
  repo: PeseeRepository
  editing?: Pesee
  /** Date figée sur aujourd'hui (saisie du jour, tableau de bord). */
  lockDate?: boolean
  /** Titre du formulaire ; `''` : aucun (déjà porté par une fenêtre). */
  title?: string
  onDone?: () => void
}) {
  const [date, setDate] = useState(editing?.date ?? dateLocale())
  const [poids, setPoids] = useState(editing ? String(editing.poids) : '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const notify = useToast()
  const existing = pesees.find((p) => p.date === date)
  const chronologie = useMemo(
    () => [...pesees].sort((a, b) => a.date.localeCompare(b.date)),
    [pesees],
  )
  const saisi = Number(poids.replace(',', '.').trim())
  // Avertit sans bloquer (D35) : comparaison à la tendance des pesées antérieures.
  const avis =
    poids.trim() !== '' && !Number.isNaN(saisi)
      ? evaluerPlausibilite(saisi, date, chronologie)
      : null

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
      notify(`Pesée du ${formatDay(date)} enregistrée ✓`)
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
      {title !== '' && <h2>{title ?? (editing ? 'Modifier la pesée' : 'Nouvelle pesée')}</h2>}
      <label>
        Date
        <input
          type="date"
          value={date}
          max={dateLocale()}
          required
          disabled={Boolean(editing) || lockDate}
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
      {avis && (
        <p className="avertissement" aria-live="polite">
          ⚠️ Saisie improbable : {messageAvis(avis)} Vérifie avant d’enregistrer.
        </p>
      )}
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
