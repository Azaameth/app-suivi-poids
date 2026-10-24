import { useEffect, useState } from 'react'
import type { SyncState } from '../../core'
import { useServices } from '../../context/ServicesContext'

const LABELS: Record<SyncState, string> = {
  online: '● En ligne',
  offline: '○ Hors ligne : les modifications partiront au retour du réseau',
  pending: '↻ Synchronisation…',
}

export function SyncIndicator() {
  const { data } = useServices()
  const [state, setState] = useState<SyncState>('online')
  useEffect(() => data.watchSyncState(setState), [data])
  return (
    <p role="status" data-state={state}>
      {LABELS[state]}
    </p>
  )
}
