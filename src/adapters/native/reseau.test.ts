import { describe, expect, test } from 'vitest'
import { SyncTracker } from '../web/SyncTracker'
import { reseauCapacitor, type SourceReseau } from './reseau'

function sourceFactice(initial: boolean) {
  let ecouteur: (s: { connected: boolean }) => void = () => {}
  const source: SourceReseau = {
    getStatus: () => Promise.resolve({ connected: initial }),
    addListener: (_e, f) => (ecouteur = f),
  }
  return { source, emettre: (connected: boolean) => ecouteur({ connected }) }
}

describe('réseau Android → SyncTracker', () => {
  test('état initial corrigé par le plugin, puis changements', async () => {
    const { source, emettre } = sourceFactice(false)
    const sync = new SyncTracker(reseauCapacitor(source))
    const etats: string[] = []
    sync.watch((etat) => etats.push(etat))
    await Promise.resolve()
    expect(sync.state).toBe('offline')
    emettre(true)
    expect(sync.state).toBe('online')
    emettre(false)
    expect(sync.state).toBe('offline')
    expect(etats.at(-1)).toBe('offline')
  })

  test('un statut identique ne notifie rien', async () => {
    const { source, emettre } = sourceFactice(true)
    const sync = new SyncTracker(reseauCapacitor(source))
    await Promise.resolve()
    let notifications = 0
    sync.watch(() => notifications++)
    emettre(true)
    expect(notifications).toBe(1) // seulement l'appel immédiat de watch
  })
})
