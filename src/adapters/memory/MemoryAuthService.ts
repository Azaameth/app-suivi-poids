import type { AuthService, AuthUser } from '../../core'

/** Fausse auth pour les tests : chaque connexion renvoie le même compte fictif. */
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

  async signIn() {
    this.setUser({ uid: 'uid-test', email: 'test@example.com', displayName: 'Test' })
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
