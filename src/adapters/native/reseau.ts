import { Network } from '@capacitor/network'
import type { NetworkTarget } from '../web/SyncTracker'

/** Ce que `reseauCapacitor` attend du plugin Network (remplaçable dans les tests). */
export interface SourceReseau {
  getStatus(): Promise<{ connected: boolean }>
  addListener(
    evenement: 'networkStatusChange',
    ecouteur: (statut: { connected: boolean }) => void,
  ): unknown
}

/**
 * État du réseau d'Android (`@capacitor/network`), présenté comme `window` au SyncTracker :
 * mêmes événements `online` / `offline`, même `navigator.onLine`. Un seul abonnement au plugin.
 */
export function reseauCapacitor(source: SourceReseau = Network): NetworkTarget {
  const ecouteurs = { online: new Set<() => void>(), offline: new Set<() => void>() }
  const cible = {
    navigator: { onLine: navigator.onLine },
    addEventListener(type: string, ecouteur: () => void) {
      if (type === 'online' || type === 'offline') ecouteurs[type].add(ecouteur)
    },
  }
  const changer = ({ connected }: { connected: boolean }) => {
    if (connected === cible.navigator.onLine) return
    cible.navigator.onLine = connected
    ecouteurs[connected ? 'online' : 'offline'].forEach((e) => e())
  }
  source.addListener('networkStatusChange', changer)
  // État initial exact : navigator.onLine n'est qu'une estimation dans la WebView.
  void source.getStatus().then(changer)
  return cible as unknown as NetworkTarget
}
