import { useEffect, useState } from 'react'
import type { SyncState } from '../../core'
import { useServices } from '../../context/ServicesContext'

function label(state: SyncState, pending: number): string {
  const enAttente = `${pending} modification${pending > 1 ? 's' : ''} en attente`
  switch (state) {
    case 'online':
      return '● En ligne'
    case 'pending':
      return `↻ Synchronisation… (${enAttente})`
    case 'offline':
      return pending > 0
        ? `○ Hors ligne : ${enAttente}, envoi au retour du réseau`
        : '○ Hors ligne : les modifications partiront au retour du réseau'
  }
}

export function SyncIndicator() {
  const { data } = useServices()
  const [sync, setSync] = useState<{ state: SyncState; pending: number }>({
    state: 'online',
    pending: 0,
  })
  useEffect(() => data.watchSyncState((state, pending) => setSync({ state, pending })), [data])
  return (
    <p role="status" data-state={sync.state}>
      {label(sync.state, sync.pending)}
    </p>
  )
}
