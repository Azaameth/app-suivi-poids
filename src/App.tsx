import { LoginScreen } from './features/auth/LoginScreen'
import { UserBar } from './features/auth/UserBar'
import { useAuthUser } from './features/auth/useAuthUser'
import { PeseesScreen } from './features/pesees/PeseesScreen'
import { SyncIndicator } from './features/sync/SyncIndicator'
import { VaultGate } from './features/vault/VaultGate'

export function App({ autoLockMs }: { autoLockMs?: number }) {
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
          {/* key : changer de compte recrée le coffre (et verrouille l'ancien). */}
          <VaultGate key={user.uid} uid={user.uid} autoLockMs={autoLockMs}>
            <PeseesScreen />
          </VaultGate>
        </>
      )}
    </main>
  )
}
