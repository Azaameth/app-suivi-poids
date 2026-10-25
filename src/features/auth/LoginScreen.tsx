import { useState, type FormEvent } from 'react'
import {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MIN_MOT_DE_PASSE,
  MotDePasseFaibleError,
} from '../../core'
import { useServices } from '../../context/ServicesContext'
import { Mascotte } from '../commun/Mascotte'

type Mode = 'connexion' | 'creation' | 'oubli'

const TITRES: Record<Mode, string> = {
  connexion: 'Se connecter avec un e-mail',
  creation: 'Créer un compte avec un e-mail',
  oubli: 'Mot de passe oublié',
}

function messageErreur(error: unknown) {
  if (
    error instanceof IdentifiantsInvalidesError ||
    error instanceof EmailDejaUtiliseError ||
    error instanceof MotDePasseFaibleError
  ) {
    return error.message
  }
  if ((error as { code?: string } | null)?.code === 'auth/too-many-requests') {
    return 'Trop de tentatives : réessaie dans quelques minutes.'
  }
  return 'Connexion impossible. Vérifie le réseau puis réessaie.'
}

export function LoginScreen() {
  const { auth } = useServices()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function signIn() {
    setPending(true)
    setError(null)
    try {
      await auth.signIn({ method: 'google' })
    } catch {
      setError('Connexion impossible. Réessaie (popup bloquée ou fermée ?).')
    } finally {
      setPending(false)
    }
  }

  function changerMode(suivant: Mode | null) {
    setMode(suivant)
    setError(null)
    setInfo(null)
    setMotDePasse('')
    setConfirmation('')
  }

  async function envoyer(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    if (mode === 'creation' && motDePasse !== confirmation) {
      return setError('Les deux mots de passe ne correspondent pas.')
    }
    setPending(true)
    try {
      if (mode === 'oubli') {
        await auth.reinitialiserMotDePasse(email)
        setInfo(
          'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d’y être envoyé.',
        )
      } else {
        await auth.signIn({ method: 'email', email, motDePasse, creation: mode === 'creation' })
      }
    } catch (e) {
      setError(messageErreur(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="accueil">
      <Mascotte taille={160} expression={error ? 'triste' : 'content'} />
      <h2>Bonjour, je suis le Professeur Machimoto !</h2>
      <p>
        Je t’aide à suivre ton poids au fil des jours. Tes pesées sont chiffrées : personne d’autre
        que toi ne peut les lire.
      </p>

      {mode === null ? (
        <>
          <button type="button" onClick={signIn} disabled={pending}>
            {pending ? 'Connexion…' : 'Se connecter avec Google'}
          </button>
          <button type="button" className="lien" onClick={() => changerMode('connexion')}>
            Utiliser un e-mail
          </button>
        </>
      ) : (
        <form className="connexion-email" onSubmit={envoyer} aria-label={TITRES[mode]}>
          <h3>{TITRES[mode]}</h3>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          {mode !== 'oubli' && (
            <label>
              Mot de passe
              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
                minLength={mode === 'creation' ? MIN_MOT_DE_PASSE : undefined}
                required
              />
            </label>
          )}
          {mode === 'creation' && (
            <>
              <label>
                Confirmation
                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
              <p className="hint">
                Au moins {MIN_MOT_DE_PASSE} caractères. Ce mot de passe sert à te connecter ; ta
                phrase secrète, choisie juste après, chiffre tes pesées. Ce sont deux secrets
                différents.
              </p>
            </>
          )}
          <button type="submit" className="principal" disabled={pending}>
            {pending
              ? 'Un instant…'
              : mode === 'connexion'
                ? 'Se connecter'
                : mode === 'creation'
                  ? 'Créer mon compte'
                  : 'Envoyer le lien'}
          </button>
          <p className="row">
            {mode === 'connexion' && (
              <>
                <button type="button" className="lien" onClick={() => changerMode('creation')}>
                  Créer un compte
                </button>
                <button type="button" className="lien" onClick={() => changerMode('oubli')}>
                  Mot de passe oublié ?
                </button>
              </>
            )}
            {mode !== 'connexion' && (
              <button type="button" className="lien" onClick={() => changerMode('connexion')}>
                J’ai déjà un compte
              </button>
            )}
            <button type="button" className="lien" onClick={() => changerMode(null)}>
              Retour à Google
            </button>
          </p>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {info && <p role="status">{info}</p>}
    </section>
  )
}
