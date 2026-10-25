import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
} from 'firebase/firestore'
import { emulatorHosts, firebaseConfig } from '../../firebase.config'
import { preferencesStockees } from './WebPreferencesStore'

// En dev (`npm run dev`) ou avec un projet « demo- », on ne parle qu'aux émulateurs.
const useEmulators = import.meta.env.DEV || firebaseConfig.projectId.startsWith('demo-')

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

/**
 * Cache Firestore (D49, révise D4) : persistant (IndexedDB) si « Garder mes données sur cet
 * appareil » est actif — démarrage hors ligne, écritures en attente conservées. Il ne contient
 * que ce que voit le serveur : poids et notes chiffrés, dates, clé encapsulée ; jamais la phrase
 * ni la clé déverrouillée. Option désactivée : cache mémoire, et l'ancienne copie est effacée.
 */
const horsLigne = preferencesStockees().horsLigne

export const db = initializeFirestore(app, {
  localCache: horsLigne
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache(),
})

// Le branchement aux émulateurs doit précéder toute autre opération Firestore.
if (useEmulators) {
  connectAuthEmulator(auth, emulatorHosts.auth, { disableWarnings: true })
  connectFirestoreEmulator(db, emulatorHosts.firestore.host, emulatorHosts.firestore.port)
}

if (!horsLigne) {
  // Option désactivée : effacer une éventuelle copie locale d'avant (rien à faire sinon).
  void clearIndexedDbPersistence(db).catch(() => {})
}

/**
 * Efface la copie locale (déconnexion, suppression du compte) puis recharge l'appli :
 * le SDK exige d'arrêter Firestore avant d'effacer, et ne peut pas repartir ensuite.
 */
export async function viderCacheLocal() {
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } finally {
    location.reload()
  }
}
