import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  IdentifiantsInvalidesError,
  type AuthService,
  type AuthUser,
  type Credentials,
} from '../../core'
import { codeErreur, traduireErreurAuth } from './erreursAuth'
import { auth, viderCacheLocal } from './firebase'

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  const email = user.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID)
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    fournisseur: email ? 'email' : 'google',
  }
}

/**
 * Firebase Auth : Google par popup (la redirection pose problème avec le cloisonnement du
 * stockage tiers des navigateurs récents), ou e-mail et mot de passe (D53).
 * Session : persistance par défaut du SDK, elle survit au rechargement (D17).
 * Elle ne contient que le jeton d'auth, jamais la clé de données ni la phrase secrète.
 */
export class WebAuthService implements AuthService {
  currentUser() {
    return toAuthUser(auth.currentUser)
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void) {
    return onAuthStateChanged(auth, (user) => listener(toAuthUser(user)))
  }

  async signIn(credentials: Credentials) {
    switch (credentials.method) {
      case 'google': {
        const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
        return toAuthUser(user)!
      }
      case 'email': {
        const { email, motDePasse, creation } = credentials
        try {
          const connexion = creation ? createUserWithEmailAndPassword : signInWithEmailAndPassword
          const { user } = await connexion(auth, email.trim(), motDePasse)
          return toAuthUser(user)!
        } catch (error) {
          throw traduireErreurAuth(error)
        }
      }
    }
  }

  async reinitialiserMotDePasse(email: string) {
    auth.languageCode = 'fr'
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (error) {
      // Ne pas révéler si un compte existe pour cet e-mail.
      if (codeErreur(error) !== 'auth/user-not-found') throw traduireErreurAuth(error)
    }
  }

  async confirmerMotDePasse(motDePasse: string) {
    const user = auth.currentUser
    if (!user?.email) throw new IdentifiantsInvalidesError()
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, motDePasse))
    } catch (error) {
      throw traduireErreurAuth(error)
    }
  }

  async signOut() {
    await signOut(auth)
    // La copie locale (D49) ne survit pas à la déconnexion.
    await viderCacheLocal()
  }

  async deleteAccount() {
    const user = auth.currentUser
    if (!user) return
    try {
      await deleteUser(user)
    } catch (error) {
      // Firebase exige une connexion récente pour supprimer un compte : on la redemande.
      if ((error as { code?: string }).code !== 'auth/requires-recent-login') throw error
      await reauthenticateWithPopup(user, new GoogleAuthProvider())
      await deleteUser(user)
    }
    await viderCacheLocal()
  }
}
