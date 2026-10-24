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

export const firebaseConfig = import.meta.env.PROD ? prodConfig : demoConfig

export const emulatorHosts = {
  auth: 'http://127.0.0.1:9099',
  firestore: { host: '127.0.0.1', port: 8080 },
} as const
