import type { Unsubscribe } from '../types'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  /** Méthode de connexion du compte : décide notamment de la confirmation avant suppression. */
  fournisseur: 'google' | 'email'
}

/** Google, ou e-mail et mot de passe (D53, révise D15). */
export type Credentials =
  { method: 'google' } | { method: 'email'; email: string; motDePasse: string; creation?: boolean }

/** Longueur minimale du mot de passe de connexion (distinct de la phrase secrète). */
export const MIN_MOT_DE_PASSE = 8

/** E-mail ou mot de passe incorrect (message volontairement indistinct). */
export class IdentifiantsInvalidesError extends Error {
  constructor() {
    super('E-mail ou mot de passe incorrect.')
  }
}

export class EmailDejaUtiliseError extends Error {
  constructor() {
    super(
      'Un compte existe déjà avec cet e-mail : connecte-toi, ou utilise « Mot de passe oublié ».',
    )
  }
}

export class MotDePasseFaibleError extends Error {
  constructor() {
    super(`Mot de passe trop court : au moins ${MIN_MOT_DE_PASSE} caractères.`)
  }
}

export interface AuthService {
  currentUser(): AuthUser | null
  /** Appelé immédiatement avec l'état courant, puis à chaque changement. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): Unsubscribe
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
  /**
   * E-mail de réinitialisation du mot de passe. Ne révèle pas si le compte existe.
   * Ne concerne que la connexion : la phrase secrète, elle, ne se réinitialise pas.
   */
  reinitialiserMotDePasse(email: string): Promise<void>
  /** Confirme l'identité d'un compte e-mail avant une action sensible (suppression). */
  confirmerMotDePasse(motDePasse: string): Promise<void>
  /** Supprime définitivement le compte (peut redemander une connexion Google récente). */
  deleteAccount(): Promise<void>
}
