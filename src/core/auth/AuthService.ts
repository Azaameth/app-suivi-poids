import type { Unsubscribe } from '../types'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
}

// Google uniquement (D15). L'union permettra d'ajouter une méthode sans casser l'interface.
export type Credentials = { method: 'google' }

export interface AuthService {
  currentUser(): AuthUser | null
  /** Appelé immédiatement avec l'état courant, puis à chaque changement. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): Unsubscribe
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
  /** Supprime définitivement le compte (peut redemander une connexion Google récente). */
  deleteAccount(): Promise<void>
}
