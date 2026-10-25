import { createContext, useContext } from 'react'

/** Nouvelle version de l'appli (service worker, bloc 2.14) : signalée, puis appliquée sur demande. */
export interface MiseAJour {
  /** `onDisponible` est appelé quand une nouvelle version attend (aussitôt si c'est déjà le cas). */
  surveiller(onDisponible: () => void): () => void
  /** Active la nouvelle version et recharge la page. */
  appliquer(): void
}

/** Par défaut (tests, Android au jalon 3) : jamais de mise à jour à proposer. */
const aucune: MiseAJour = { surveiller: () => () => {}, appliquer: () => {} }

export const MiseAJourContext = createContext<MiseAJour>(aucune)

export const useMiseAJour = () => useContext(MiseAJourContext)
