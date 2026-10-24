import { LoginScreen } from './features/auth/LoginScreen'
import { UserBar } from './features/auth/UserBar'
import { useAuthUser } from './features/auth/useAuthUser'
import { SyncIndicator } from './features/sync/SyncIndicator'

export function App() {
  const user = useAuthUser()
  return (
    <main>
      <h1>Professeur Machimoto</h1>
      {user === undefined && <p>Chargement…</p>}
      {user === null && <LoginScreen />}
      {user && (
        <>
          <UserBar user={user} />
          <SyncIndicator />
        </>
      )}
    </main>
  )
}
