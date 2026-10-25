import {
  GoogleAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import type { AuthService, AuthUser, Credentials } from '../../core'
import { auth } from './firebase'

function toAuthUser(user: User | null): AuthUser | null {
  return user && { uid: user.uid, email: user.email, displayName: user.displayName }
}

/**
 * Firebase Auth, connexion Google par popup (la redirection pose problème avec le
 * cloisonnement du stockage tiers des navigateurs récents).
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
    }
  }

  async signOut() {
    await signOut(auth)
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
  }
}
