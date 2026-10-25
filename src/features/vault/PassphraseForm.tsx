import { useState, type FormEvent, type ReactNode } from 'react'

export interface Field {
  name: string
  label: string
  autoComplete: 'current-password' | 'new-password' | 'off'
  /** Texte visible (code de secours) plutôt que masqué. */
  visible?: boolean
}

/**
 * Formulaire générique de phrase secrète : champs masqués, bouton occupé pendant le
 * calcul (PBKDF2 prend environ une seconde, c'est voulu), message d'erreur.
 */
export function PassphraseForm({
  fields,
  submitLabel,
  busyLabel,
  onSubmit,
  children,
}: {
  fields: Field[]
  submitLabel: string
  busyLabel: string
  /** Renvoie un message d'erreur, ou rien si tout s'est bien passé. */
  onSubmit: (values: Record<string, string>) => Promise<string | void>
  children?: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(
      fields.map(({ name }) => [name, (form.elements.namedItem(name) as HTMLInputElement).value]),
    )
    setBusy(true)
    setError(null)
    try {
      const message = await onSubmit(values)
      if (message) setError(message)
      else form.reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}
      {fields.map(({ name, label, autoComplete, visible }) => (
        <p key={name}>
          <label>
            {label}{' '}
            <input
              name={name}
              type={visible ? 'text' : 'password'}
              autoComplete={autoComplete}
              spellCheck={false}
              required
            />
          </label>
        </p>
      ))}
      <button type="submit" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
