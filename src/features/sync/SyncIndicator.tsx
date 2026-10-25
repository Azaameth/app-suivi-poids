import { useEffect, useState } from 'react'
import type { SyncState } from '../../core'
import { useServices } from '../../context/ServicesContext'

function label(state: SyncState, pending: number): { court: string; complet: string } {
  const enAttente = `${pending} modification${pending > 1 ? 's' : ''} en attente`
  switch (state) {
    case 'online':
      return { court: 'En ligne', complet: 'En ligne' }
    case 'pending':
      return { court: 'Synchro…', complet: `Synchronisation… (${enAttente})` }
    case 'offline':
      return {
        court: pending > 0 ? `Hors ligne · ${pending}` : 'Hors ligne',
        complet:
          pending > 0
            ? `Hors ligne : ${enAttente}, envoi au retour du réseau`
            : 'Hors ligne : les modifications partiront au retour du réseau',
      }
  }
}

/** Puce d'état de synchro : texte court visible, phrase complète pour les lecteurs d'écran. */
export function SyncIndicator() {
  const { data } = useServices()
  const [sync, setSync] = useState<{ state: SyncState; pending: number }>({
    state: 'online',
    pending: 0,
  })
  useEffect(() => data.watchSyncState((state, pending) => setSync({ state, pending })), [data])
  const { court, complet } = label(sync.state, sync.pending)
  return (
    <p role="status" className="puce-synchro" data-state={sync.state} title={complet}>
      <span aria-hidden="true">{court}</span>
      <span className="sr-only">{complet}</span>
    </p>
  )
}
