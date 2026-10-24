import type { SyncState } from '../../core'

/** Ce dont le suivi a besoin de `window` (remplaçable dans les tests). */
export type NetworkTarget = Pick<Window, 'addEventListener'> & { navigator: { onLine: boolean } }

/**
 * Combine l'état du réseau (événements `online` / `offline` du navigateur) et le nombre
 * d'écritures pas encore confirmées par le serveur.
 * `navigator.onLine` ne garantit pas l'accès à Internet, mais `offline` est fiable.
 */
export class SyncTracker {
  private pending = 0
  private online: boolean
  private listeners = new Set<(state: SyncState) => void>()

  constructor(target: NetworkTarget = window) {
    this.online = target.navigator.onLine
    target.addEventListener('online', () => this.setOnline(true))
    target.addEventListener('offline', () => this.setOnline(false))
  }

  get state(): SyncState {
    if (!this.online) return 'offline'
    return this.pending > 0 ? 'pending' : 'online'
  }

  /** Suit une écriture : `pending` jusqu'à ce que la promesse soit résolue ou rejetée. */
  track<T>(write: Promise<T>): Promise<T> {
    this.pending++
    this.notify()
    return write.finally(() => {
      this.pending--
      this.notify()
    })
  }

  watch(listener: (state: SyncState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setOnline(online: boolean) {
    this.online = online
    this.notify()
  }

  private notify() {
    const state = this.state
    this.listeners.forEach((listener) => listener(state))
  }
}
