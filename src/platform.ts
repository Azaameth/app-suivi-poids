import { Capacitor } from '@capacitor/core'
import { MemoryKeyStore } from './adapters/memory/MemoryKeyStore'
import type { MiseAJour } from './context/MiseAJourContext'
import type { Services } from './core'

/**
 * Seul endroit qui choisit les implémentations concrètes : web, ou `native/` sur Android
 * (bloc 3.3). Imports dynamiques : chaque plateforme ne charge que ses adaptateurs (le SDK
 * Firebase web s'initialise dès son import ; inutile, et en double, sur Android).
 */
export async function createServices(): Promise<Services> {
  if (Capacitor.isNativePlatform()) {
    const [{ NativeAuthService }, { NativeDataStore }, prefs, files] = await Promise.all([
      import('./adapters/native/NativeAuthService'),
      import('./adapters/native/NativeDataStore'),
      import('./adapters/web/WebPreferencesStore'),
      import('./adapters/web/WebFileExporter'),
    ])
    return {
      auth: new NativeAuthService(), // Firebase Auth natif (émulateur pour l'APK de debug)
      data: new NativeDataStore(), // Firestore natif, cache hors ligne d'Android
      keys: new MemoryKeyStore(), // en mémoire en attendant le KeyStore natif (D13, à trancher)
      prefs: new prefs.WebPreferencesStore(), // localStorage de la WebView, rien de secret (D26)
      files: new files.WebFileExporter(), // partage natif à venir (D27)
    }
  }
  const [{ db }, { WebAuthService }, { WebDataStore }, prefs, files] = await Promise.all([
    import('./adapters/web/firebase'),
    import('./adapters/web/WebAuthService'),
    import('./adapters/web/WebDataStore'),
    import('./adapters/web/WebPreferencesStore'),
    import('./adapters/web/WebFileExporter'),
  ])
  return {
    auth: new WebAuthService(), // Firebase Auth (émulateur en dev)
    data: new WebDataStore(db), // Firestore, cache persistant chiffré ou mémoire (D49)
    keys: new MemoryKeyStore(), // web : clé en mémoire uniquement, voulu (D13)
    prefs: new prefs.WebPreferencesStore(), // localStorage, rien de secret (D26)
    files: new files.WebFileExporter(), // téléchargement (D27)
  }
}

/**
 * Service worker : appli disponible hors ligne, nouvelles versions proposées (bloc 2.14).
 * Android : jamais (D64). Les fichiers sont dans l'APK, mis à jour avec lui ; un service worker
 * risquerait de resservir une ancienne version après une mise à jour de l'APK.
 */
export async function createMiseAJour(): Promise<MiseAJour> {
  if (Capacitor.isNativePlatform()) return { surveiller: () => () => {}, appliquer: () => {} }
  const { creerMiseAJourWeb } = await import('./adapters/web/miseAJour')
  return creerMiseAJourWeb()
}
