import type { AuthUser } from '../../core'
import { useServices } from '../../context/ServicesContext'

export function UserBar({ user }: { user: AuthUser }) {
  const { auth } = useServices()
  return (
    <p>
      Connecté : {user.displayName ?? user.email ?? user.uid}{' '}
      <button type="button" onClick={() => auth.signOut()}>
        Se déconnecter
      </button>
    </p>
  )
}
