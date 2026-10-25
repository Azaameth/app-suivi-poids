import { MemoryKeyStore } from './adapters/memory/MemoryKeyStore'
import { db } from './adapters/web/firebase'
import { creerMiseAJourWeb } from './adapters/web/miseAJour'
import { WebAuthService } from './adapters/web/WebAuthService'
import { WebDataStore } from './adapters/web/WebDataStore'
import { WebFileExporter } from './adapters/web/WebFileExporter'
import { WebPreferencesStore } from './adapters/web/WebPreferencesStore'
import type { MiseAJour } from './context/MiseAJourContext'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes (web aujourd'hui, `native/` sur
 * Android au jalon 3).
 */
export function createServices(): Services {
  return {
    auth: new WebAuthService(), // Firebase Auth (émulateur en dev)
    data: new WebDataStore(db), // Firestore, cache persistant chiffré ou mémoire (D49)
    keys: new MemoryKeyStore(), // web : clé en mémoire uniquement, voulu (D13)
    prefs: new WebPreferencesStore(), // localStorage, rien de secret (D26)
    files: new WebFileExporter(), // téléchargement (D27)
  }
}

/** Service worker : appli disponible hors ligne, nouvelles versions proposées (bloc 2.14). */
export function createMiseAJour(): MiseAJour {
  return creerMiseAJourWeb()
}
