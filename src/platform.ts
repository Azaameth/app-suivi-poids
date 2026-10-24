import { createMemoryServices } from './adapters/memory'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes.
 * Pour l'instant : fausses implémentations en mémoire.
 * Ensuite : adaptateurs `web/` (Firebase JS SDK), puis `native/` sur Android (jalon 3).
 */
export function createServices(): Services {
  return createMemoryServices()
}
