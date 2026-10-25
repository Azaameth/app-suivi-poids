import {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MIN_MOT_DE_PASSE,
  MotDePasseFaibleError,
  type AuthService,
  type AuthUser,
  type Credentials,
} from '../../core'

/**
 * Fausse auth pour les tests : Google renvoie toujours le même compte fictif ; les comptes
 * e-mail sont gardés en mémoire (mot de passe en clair : tests uniquement).
 */
export class MemoryAuthService implements AuthService {
  private user: AuthUser | null = null
  private listeners = new Set<(user: AuthUser | null) => void>()
  private comptes = new Map<string, string>()
  /** E-mails de réinitialisation « envoyés », pour les tests. */
  readonly reinitialisations: string[] = []

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

  async signIn(credentials: Credentials = { method: 'google' }) {
    if (credentials.method === 'google') {
      this.setUser({
        uid: 'uid-test',
        email: 'test@example.com',
        displayName: 'Test',
        fournisseur: 'google',
      })
      return this.user!
    }
    const { email, motDePasse, creation } = credentials
    if (creation) {
      if (motDePasse.length < MIN_MOT_DE_PASSE) throw new MotDePasseFaibleError()
      if (this.comptes.has(email)) throw new EmailDejaUtiliseError()
      this.comptes.set(email, motDePasse)
    } else if (this.comptes.get(email) !== motDePasse) {
      throw new IdentifiantsInvalidesError()
    }
    this.setUser({ uid: `uid-${email}`, email, displayName: null, fournisseur: 'email' })
    return this.user!
  }

  async signOut() {
    this.setUser(null)
  }

  async reinitialiserMotDePasse(email: string) {
    this.reinitialisations.push(email)
  }

  async confirmerMotDePasse(motDePasse: string) {
    const email = this.user?.email
    if (!email || this.comptes.get(email) !== motDePasse) throw new IdentifiantsInvalidesError()
  }

  async deleteAccount() {
    if (this.user?.email) this.comptes.delete(this.user.email)
    this.setUser(null)
  }

  private setUser(user: AuthUser | null) {
    this.user = user
    this.listeners.forEach((listener) => listener(user))
  }
}
