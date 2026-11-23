import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { FirebaseFirestore } from '@capacitor-firebase/firestore'
import { emulatorHosts, firebaseConfig } from '../../firebase.config'

/**
 * Firebase natif (Android, bloc 3.3). Le projet vient de `google-services.json` : fictif
 * (`demo-…`) pour l'APK de debug (D65), réel pour la release. Comme sur le web (D63), le projet
 * fictif ne parle qu'aux émulateurs, joints par `localhost` grâce à `adb reverse`.
 *
 * Attention : recharger la WebView ne redémarre pas le SDK natif, qui garde son état (émulateur
 * branché, cache ouvert) tant que le processus Android vit.
 */
const useEmulators = firebaseConfig.projectId.startsWith('demo-')

/** Demande de vidage du cache Firestore natif, honorée au prochain démarrage à froid. */
const VIDAGE_DEMANDE = 'machimoto.viderCacheNatif'

/** Le SDK natif est déjà démarré (WebView rechargée) : son réglage précédent tient toujours. */
const dejaDemarre = (erreur: unknown) =>
  /already (been )?(initialized|started)/i.test(String(erreur))

async function initialiser() {
  // Le SDK n'accepte d'effacer son cache qu'avant toute autre opération Firestore, donc au
  // démarrage à froid ; sinon la demande attend le suivant.
  if (localStorage.getItem(VIDAGE_DEMANDE)) {
    try {
      await FirebaseFirestore.clearPersistence()
      localStorage.removeItem(VIDAGE_DEMANDE)
    } catch {
      // SDK déjà démarré : on réessaiera au prochain démarrage.
    }
  }
  if (useEmulators) {
    // Accès entre crochets : ESLint prendrait `useEmulator` pour un hook React (préfixe « use »).
    const auth = new URL(emulatorHosts.auth)
    await FirebaseAuthentication['useEmulator']({ host: 'localhost', port: Number(auth.port) })
    await FirebaseFirestore['useEmulator']({
      host: 'localhost',
      port: emulatorHosts.firestore.port,
    }).catch((erreur: unknown) => {
      if (!dejaDemarre(erreur)) throw erreur
    })
  }
}

/** Toute opération Firebase native attend cette promesse (émulateurs, cache à vider). */
export const pret = initialiser()

/**
 * Copie locale à effacer (déconnexion, suppression du compte). Le SDK natif ne peut pas le faire
 * tant qu'il tourne : c'est fait au prochain démarrage de l'appli. Le cache ne contient que ce
 * que voit le serveur (pesées chiffrées, clé encapsulée), jamais la phrase ni la clé en clair.
 */
export function viderCacheLocal() {
  localStorage.setItem(VIDAGE_DEMANDE, '1')
}
