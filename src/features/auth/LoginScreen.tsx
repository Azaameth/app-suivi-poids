import { useState } from 'react'
import { useServices } from '../../context/ServicesContext'

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
    <section>
      <p>Connecte-toi pour retrouver tes pesées.</p>
      <button type="button" onClick={signIn} disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter avec Google'}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
