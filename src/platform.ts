import { MemoryKeyStore } from './adapters/memory/MemoryKeyStore'
import { db } from './adapters/web/firebase'
import { WebAuthService } from './adapters/web/WebAuthService'
import { WebDataStore } from './adapters/web/WebDataStore'
import { WebFileExporter } from './adapters/web/WebFileExporter'
import { WebPreferencesStore } from './adapters/web/WebPreferencesStore'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes (web aujourd'hui, `native/` sur
 * Android au jalon 3).
 */
export function createServices(): Services {
  return {
    auth: new WebAuthService(), // Firebase Auth (émulateur en dev)
    data: new WebDataStore(db), // Firestore, cache mémoire (D4)
    keys: new MemoryKeyStore(), // web : clé en mémoire uniquement, voulu (D13)
    prefs: new WebPreferencesStore(), // localStorage, rien de secret (D26)
    files: new WebFileExporter(), // téléchargement (D27)
  }
}
