import type { AuthService, AuthUser, Credentials } from '../../core'

/** Fausse auth pour les tests et le dev hors émulateur : accepte n'importe quel mot de passe. */
export class MemoryAuthService implements AuthService {
  private user: AuthUser | null = null
  private listeners = new Set<(user: AuthUser | null) => void>()

  currentUser() {
    return this.user
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void) {
    this.listeners.add(listener)
    listener(this.user)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async signIn(credentials: Credentials) {
    this.setUser({ uid: `uid-${credentials.email}`, email: credentials.email })
    return this.user!
  }

  async signOut() {
    this.setUser(null)
  }

  private setUser(user: AuthUser | null) {
    this.user = user
    this.listeners.forEach((listener) => listener(user))
  }
}
