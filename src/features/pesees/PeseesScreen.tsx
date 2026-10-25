import { useState } from 'react'
import type { Pesee } from '../../core/pesees'
import { DevTools } from '../dev/DevTools'
import { SettingsPanel } from '../prefs/SettingsPanel'
import { ExportPanel } from './ExportPanel'
import { PeseeForm } from './PeseeForm'
import { PeseeList } from './PeseeList'
import { usePesees } from './usePesees'
import { WeightChart } from './WeightChart'

const TABS = { journal: 'Journal', graphique: 'Graphique', reglages: 'Export & réglages' } as const
type Tab = keyof typeof TABS

export function PeseesScreen() {
  const { state, repo } = usePesees()
  const [tab, setTab] = useState<Tab>('journal')
  const [editing, setEditing] = useState<Pesee | undefined>()
  const [removeError, setRemoveError] = useState(false)

  function remove(date: string) {
    setRemoveError(false)
    repo.remove(date).synced.catch(() => setRemoveError(true))
  }

  return (
    <>
      <nav className="tabs">
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>
            {TABS[key]}
          </button>
        ))}
      </nav>

      {state.status === 'loading' && <p>Chargement des pesées…</p>}
      {state.status === 'error' && (
        <p role="alert">Impossible de charger les pesées. Vérifie la connexion puis recharge.</p>
      )}
      {state.status === 'ready' && (
        <>
          {state.unreadable && (
            <p role="alert">Certaines pesées sont illisibles (donnée altérée) et sont masquées.</p>
          )}
          {removeError && <p role="alert">Le serveur a refusé la suppression.</p>}
          {tab === 'journal' && (
            <>
              <PeseeForm
                key={editing?.date ?? 'nouvelle'}
                pesees={state.pesees}
                repo={repo}
                editing={editing}
                onDone={() => setEditing(undefined)}
              />
              <PeseeList pesees={state.pesees} onEdit={setEditing} onRemove={remove} />
            </>
          )}
          {tab === 'graphique' && <WeightChart pesees={state.pesees} />}
          {tab === 'reglages' && <ExportPanel pesees={state.pesees} />}
          {import.meta.env.DEV && tab === 'reglages' && (
            <DevTools pesees={state.pesees} repo={repo} />
          )}
        </>
      )}
      {tab === 'reglages' && <SettingsPanel />}
    </>
  )
}
