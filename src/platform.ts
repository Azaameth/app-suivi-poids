import { createMemoryServices } from './adapters/memory'
import { db } from './adapters/web/firebase'
import { WebAuthService } from './adapters/web/WebAuthService'
import { WebDataStore } from './adapters/web/WebDataStore'
import { WebFileExporter } from './adapters/web/WebFileExporter'
import { WebPreferencesStore } from './adapters/web/WebPreferencesStore'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes.
 * Auth et données : Firebase (émulateurs en dev). Clé : en mémoire.
 * Préférences : localStorage. Export : téléchargement.
 * Ensuite : adaptateurs `native/` sur Android (jalon 3).
 */
export function createServices(): Services {
  return {
    ...createMemoryServices(),
    auth: new WebAuthService(),
    data: new WebDataStore(db),
    prefs: new WebPreferencesStore(),
    files: new WebFileExporter(),
  }
}
