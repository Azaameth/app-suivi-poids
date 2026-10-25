import { useState } from 'react'
import { useServices } from '../../context/ServicesContext'
import { Mascotte } from '../commun/Mascotte'

export function LoginScreen() {
  const { auth } = useServices()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <section className="accueil">
      <Mascotte taille={160} expression={error ? 'triste' : 'content'} />
      <h2>Bonjour, je suis le Professeur Machimoto !</h2>
      <p>
        Je t’aide à suivre ton poids au fil des jours. Tes pesées sont chiffrées : personne d’autre
        que toi ne peut les lire.
      </p>
      <button type="button" onClick={signIn} disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter avec Google'}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
