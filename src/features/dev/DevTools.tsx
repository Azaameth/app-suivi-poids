import { useState } from 'react'
import type { Pesee, PeseeRepository } from '../../core/pesees'
import { fakePesees } from './fakePesees'

/**
 * Outils de développement (données fictives). Affiché uniquement sous `npm run dev` :
 * en production, `import.meta.env.DEV` vaut false et ce code est retiré du bundle.
 */
export function DevTools({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(label: string, action: () => Promise<Promise<void>[]>) {
    setBusy(true)
    setMessage(`${label}…`)
    try {
      const synced = await action()
      await Promise.all(synced)
      setMessage(`${label} : ${synced.length} pesée(s), synchronisé.`)
    } catch {
      setMessage(`${label} : échec.`)
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    const byDate = new Map(pesees.map((p) => [p.date, p]))
    const synced: Promise<void>[] = []
    for (const input of fakePesees()) {
      synced.push((await repo.save(input, byDate.get(input.date))).synced)
    }
    return synced
  }

  async function clear() {
    return pesees.map((p) => repo.remove(p.date).synced)
  }

  return (
    <section className="card">
      <h2>🧪 Outils de dev</h2>
      <p className="hint">Visible uniquement en développement (émulateurs).</p>
      <div className="row">
        <button type="button" disabled={busy} onClick={() => run('Génération', generate)}>
          Générer un an de données fictives
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy || pesees.length === 0}
          onClick={() => run('Effacement', clear)}
        >
          Tout effacer
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  )
}
