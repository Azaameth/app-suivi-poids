import {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MotDePasseFaibleError,
} from '../../core'

/** Code d'une erreur Firebase Auth (`auth/…`), ou undefined. */
export const codeErreur = (error: unknown) => (error as { code?: string } | null)?.code

/**
 * Traduit une erreur Firebase Auth de connexion par e-mail en erreur métier ; les autres
 * (réseau, trop de tentatives…) sont rendues telles quelles.
 */
export function traduireErreurAuth(error: unknown): unknown {
  switch (codeErreur(error)) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new IdentifiantsInvalidesError()
    case 'auth/email-already-in-use':
      return new EmailDejaUtiliseError()
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return new MotDePasseFaibleError()
    default:
      return error
  }
}
