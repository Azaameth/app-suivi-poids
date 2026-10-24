import type { Unsubscribe } from '../types'

export interface AuthUser {
  uid: string
  email: string | null
}

// Méthode de connexion définitive : <À DÉFINIR> (bloc 0.2). L'union permettra d'en ajouter.
export type Credentials = { method: 'emailPassword'; email: string; password: string }

export interface AuthService {
  currentUser(): AuthUser | null
  /** Appelé immédiatement avec l'état courant, puis à chaque changement. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): Unsubscribe
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
}
