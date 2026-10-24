import { createMemoryServices } from './adapters/memory'
import { WebAuthService } from './adapters/web/WebAuthService'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes.
 * Auth : Firebase (émulateur en dev). Clé et données : en mémoire jusqu'au jalon 2.
 * Ensuite : adaptateurs `native/` sur Android (jalon 3).
 */
export function createServices(): Services {
  return { ...createMemoryServices(), auth: new WebAuthService() }
}
