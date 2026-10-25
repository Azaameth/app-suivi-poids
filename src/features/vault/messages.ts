import {
  InvalidRecoveryCodeError,
  NoRecoveryCodeError,
  WrongPassphraseError,
  WrongRecoveryCodeError,
} from '../../core/crypto'
import { WeakPassphraseError } from '../../core/vault'

export const HORS_LIGNE = 'Connexion au serveur impossible. Vérifie le réseau puis réessaie.'

/** Message à afficher pour une erreur du coffre (phrase, code de secours, force, réseau). */
export function messageErreur(error: unknown, phraseIncorrecte = 'Phrase secrète incorrecte.') {
  if (error instanceof WrongPassphraseError) return phraseIncorrecte
  if (error instanceof WeakPassphraseError) return error.message
  if (error instanceof WrongRecoveryCodeError) return 'Code de secours incorrect.'
  if (error instanceof InvalidRecoveryCodeError) return error.message
  if (error instanceof NoRecoveryCodeError) {
    return 'Aucun code de secours n’a été créé pour ce compte : sans la phrase, les données ne peuvent pas être récupérées.'
  }
  return HORS_LIGNE
}
