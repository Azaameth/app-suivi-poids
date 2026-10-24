import { createMemoryServices } from './adapters/memory'
import { db } from './adapters/web/firebase'
import { WebAuthService } from './adapters/web/WebAuthService'
import { WebDataStore } from './adapters/web/WebDataStore'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes.
 * Auth et données : Firebase (émulateurs en dev). Clé : en mémoire (bloc 2.3).
 * Ensuite : adaptateurs `native/` sur Android (jalon 3).
 */
export function createServices(): Services {
  return {
    ...createMemoryServices(),
    auth: new WebAuthService(),
    data: new WebDataStore(db),
  }
}
