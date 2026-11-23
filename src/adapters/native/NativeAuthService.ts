import { FirebaseAuthentication, type User } from '@capacitor-firebase/authentication'
import type { PluginListenerHandle } from '@capacitor/core'
import {
  IdentifiantsInvalidesError,
  type AuthService,
  type AuthUser,
  type Credentials,
} from '../../core'
import { codeErreur, traduireErreurAuth } from '../web/erreursAuth'
import { pret, viderCacheLocal } from './firebaseNatif'

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  const email = user.providerData.some((p) => p.providerId === 'password')
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    fournisseur: email ? 'email' : 'google',
  }
}

/**
 * Firebase Auth natif (`@capacitor-firebase/authentication`) : Google par le sélecteur de compte
 * d'Android (Credential Manager), ou e-mail et mot de passe (D53). La session est gardée par le
 * SDK Android. Elle ne contient que le jeton d'auth, jamais la clé de données ni la phrase.
 */
export class NativeAuthService implements AuthService {
  /** Dernier état connu : `currentUser()` est synchrone, le plugin ne l'est pas. */
  private utilisateur: AuthUser | null = null

  currentUser() {
    return this.utilisateur
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void) {
    let actif = true
    let abonnement: PluginListenerHandle | undefined
    const publier = (user: User | null) => {
      this.utilisateur = toAuthUser(user)
      if (actif) listener(this.utilisateur)
    }
    void (async () => {
      await pret
      const { user } = await FirebaseAuthentication.getCurrentUser()
      publier(user)
      const handle = await FirebaseAuthentication.addListener('authStateChange', (e) =>
        publier(e.user),
      )
      if (actif) abonnement = handle
      else void handle.remove()
    })()
    return () => {
      actif = false
      void abonnement?.remove()
    }
  }

  async signIn(credentials: Credentials) {
    await pret
    try {
      const { user } =
        credentials.method === 'google'
          ? await FirebaseAuthentication.signInWithGoogle()
          : await (
              credentials.creation
                ? FirebaseAuthentication.createUserWithEmailAndPassword
                : FirebaseAuthentication.signInWithEmailAndPassword
            )({
              email: credentials.email.trim(),
              password: credentials.motDePasse,
            })
      this.utilisateur = toAuthUser(user)
      return this.utilisateur!
    } catch (error) {
      throw traduireErreurAuth(normaliser(error))
    }
  }

  async reinitialiserMotDePasse(email: string) {
    await pret
    await FirebaseAuthentication.setLanguageCode({ languageCode: 'fr' })
    try {
      await FirebaseAuthentication.sendPasswordResetEmail({ email: email.trim() })
    } catch (error) {
      // Ne pas révéler si un compte existe pour cet e-mail.
      const erreur = normaliser(error)
      if (codeErreur(erreur) !== 'auth/user-not-found') throw traduireErreurAuth(erreur)
    }
  }

  async confirmerMotDePasse(motDePasse: string) {
    await pret
    const email = this.utilisateur?.email
    if (!email) throw new IdentifiantsInvalidesError()
    // Se reconnecter avec le même compte vaut réauthentification récente.
    try {
      await FirebaseAuthentication.signInWithEmailAndPassword({ email, password: motDePasse })
    } catch (error) {
      throw traduireErreurAuth(normaliser(error))
    }
  }

  async signOut() {
    await pret
    await FirebaseAuthentication.signOut()
    // La copie locale ne survit pas à la déconnexion (comme sur le web, D49).
    viderCacheLocal()
  }

  async deleteAccount() {
    await pret
    try {
      await FirebaseAuthentication.deleteUser()
    } catch (error) {
      // Firebase exige une connexion récente pour supprimer un compte : on la redemande.
      if (codeErreur(normaliser(error)) !== 'auth/requires-recent-login') throw error
      await FirebaseAuthentication.signInWithGoogle()
      await FirebaseAuthentication.deleteUser()
    }
    viderCacheLocal()
  }
}

/**
 * Erreurs natives → codes `auth/…` du SDK web, pour réutiliser `traduireErreurAuth`.
 * Le SDK Android signale `ERROR_WRONG_PASSWORD`, `ERROR_EMAIL_ALREADY_IN_USE`, etc.
 */
export function normaliser(error: unknown): unknown {
  const code = codeErreur(error)
  if (!code || code.startsWith('auth/')) return error
  const traduit = `auth/${code
    .replace(/^ERROR_/, '')
    .toLowerCase()
    .replaceAll('_', '-')}`
  return Object.assign(Object.create(Object.getPrototypeOf(error) as object) as object, error, {
    code: traduit,
  })
}
