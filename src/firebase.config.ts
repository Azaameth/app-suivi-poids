// Config client Firebase : ces valeurs sont publiques par nature (la sécurité repose sur
// firestore.rules), elles peuvent être commitées.

/** Vrai projet (plan Spark, Firestore en europe-west1) : build de production uniquement. */
const prodConfig = {
  apiKey: 'AIzaSyAFqQcLoLzFZNF1knQ3LwAP6m8BW7MBVR8',
  authDomain: 'machimoto.firebaseapp.com',
  projectId: 'machimoto',
  storageBucket: 'machimoto.firebasestorage.app',
  messagingSenderId: '812226107859',
  appId: '1:812226107859:web:4f1fd408946d2821acf726',
}

// Le préfixe « demo- » indique à Firebase un projet fictif : les SDK ne parlent alors
// qu'aux émulateurs. En dev et en test, la prod est inaccessible par construction (D8).
const demoConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-suivi-poids.firebaseapp.com',
  projectId: 'demo-suivi-poids',
  appId: 'demo-app-id',
}

/**
 * Production seulement pour un build explicitement en mode `production` (`npm run build`, par
 * défaut). Tout autre mode (`development` pour l'APK de dev, `test`) reste sur le projet fictif.
 * Ne pas se fier à `import.meta.env.PROD` : il vaut `true` pour `vite build --mode development`
 * (constaté au bloc 3.1, l'APK de dev visait la production).
 */
export const firebaseConfig = import.meta.env.MODE === 'production' ? prodConfig : demoConfig

export const emulatorHosts = {
  auth: 'http://127.0.0.1:9099',
  firestore: { host: '127.0.0.1', port: 8080 },
} as const
