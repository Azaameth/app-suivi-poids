import { useEffect, useMemo, useState } from 'react'
import { ProfilRepository, type Profil } from '../../core/profil'
import { useServices } from '../../context/ServicesContext'
import { useUnlockedVault } from '../vault/VaultContext'

export type ProfilState =
  | { status: 'loading' }
  | { status: 'ready'; profil: Profil | null }
  /** Profil illisible ou inaccessible : l'appli continue sans objectif. */
  | { status: 'error' }

/** Profil (objectif, taille) déchiffré, en temps réel. */
export function useProfil(): { state: ProfilState; repo: ProfilRepository } {
  const { data } = useServices()
  const { uid, key } = useUnlockedVault()
  const repo = useMemo(() => new ProfilRepository(data, uid, key), [data, uid, key])
  const [state, setState] = useState<ProfilState>({ status: 'loading' })

  useEffect(
    () =>
      repo.watch(
        (profil) => setState({ status: 'ready', profil }),
        () => setState({ status: 'error' }),
      ),
    [repo],
  )

  return { state, repo }
}

/** Le profil s'il est connu, sinon `null` (chargement, erreur ou aucun profil). */
export const profilOuNull = (state: ProfilState) => (state.status === 'ready' ? state.profil : null)
