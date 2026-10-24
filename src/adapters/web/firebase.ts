import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from 'firebase/firestore'
import { emulatorHosts, firebaseConfig } from '../../firebase.config'

// En dev (`npm run dev`) ou avec un projet « demo- », on ne parle qu'aux émulateurs.
const useEmulators = import.meta.env.DEV || firebaseConfig.projectId.startsWith('demo-')

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Web : cache mémoire uniquement (aucune donnée persistée dans IndexedDB).
export const db = initializeFirestore(app, { localCache: memoryLocalCache() })

if (useEmulators) {
  connectAuthEmulator(auth, emulatorHosts.auth, { disableWarnings: true })
  connectFirestoreEmulator(db, emulatorHosts.firestore.host, emulatorHosts.firestore.port)
}
