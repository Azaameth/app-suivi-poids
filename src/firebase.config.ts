// Config client Firebase : ces valeurs sont publiques par nature (la sécurité repose sur
// firestore.rules), elles peuvent être commitées.
// Le préfixe « demo- » indique à Firebase un projet fictif : les SDK ne parlent alors
// qu'aux émulateurs. À remplacer par les valeurs du vrai projet (région europe-west1) au bloc 1.7.
export const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-suivi-poids.firebaseapp.com',
  projectId: 'demo-suivi-poids',
  appId: 'demo-app-id',
} as const

export const emulatorHosts = {
  auth: 'http://127.0.0.1:9099',
  firestore: { host: '127.0.0.1', port: 8080 },
} as const
