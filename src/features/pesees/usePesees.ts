import { useEffect, useMemo, useState } from 'react'
import { PeseeRepository, type Pesee } from '../../core/pesees'
import { useServices } from '../../context/ServicesContext'
import { useUnlockedVault } from '../vault/VaultContext'

export type PeseesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; pesees: Pesee[]; unreadable: boolean }

/** Pesées en temps réel (clair, plus récente d'abord) et dépôt pour les modifier. */
export function usePesees(): { state: PeseesState; repo: PeseeRepository } {
  const { data } = useServices()
  const { uid, key } = useUnlockedVault()
  const repo = useMemo(() => new PeseeRepository(data, uid, key), [data, uid, key])
  const [state, setState] = useState<PeseesState>({ status: 'loading' })

  useEffect(() => {
    let unreadable = false
    return repo.watch(
      (pesees) => setState({ status: 'ready', pesees, unreadable }),
      () => {
        // Document illisible (signalé avant le lot) ou abonnement impossible (avant toute donnée).
        unreadable = true
        setState((current) => (current.status === 'loading' ? { status: 'error' } : current))
      },
    )
  }, [repo])

  return { state, repo }
}
