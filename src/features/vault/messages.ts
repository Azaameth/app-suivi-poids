import { WrongPassphraseError } from '../../core/crypto'
import { WeakPassphraseError } from '../../core/vault'

export const HORS_LIGNE = 'Connexion au serveur impossible. Vérifie le réseau puis réessaie.'

/** Message à afficher pour une erreur du coffre (phrase, force, réseau). */
export function messageErreur(error: unknown, phraseIncorrecte = 'Phrase secrète incorrecte.') {
  if (error instanceof WrongPassphraseError) return phraseIncorrecte
  if (error instanceof WeakPassphraseError) return error.message
  return HORS_LIGNE
}
