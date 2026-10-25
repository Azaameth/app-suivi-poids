import { useState } from 'react'
import { LoginScreen } from './features/auth/LoginScreen'
import { useAuthUser } from './features/auth/useAuthUser'
import { PeseesScreen } from './features/pesees/PeseesScreen'
import { useAppliquerTheme } from './features/prefs/useAppliquerTheme'
import { AppHeader } from './features/shell/AppHeader'
import { NavBar } from './features/shell/NavBar'
import type { Tab } from './features/shell/onglets'
import { ToastProvider } from './features/shell/Toasts'
import { VaultGate } from './features/vault/VaultGate'

export function App({ autoLockMs }: { autoLockMs?: number }) {
  const user = useAuthUser()
  const [tab, setTab] = useState<Tab>('tableau')
  useAppliquerTheme()

  return (
    <ToastProvider>
      {user ? (
        // key : changer de compte recrée le coffre (et verrouille l'ancien).
        <VaultGate
          key={user.uid}
          uid={user.uid}
          autoLockMs={autoLockMs}
          header={(vault) => (
            <AppHeader
              user={user}
              onLock={vault?.lock}
              onSettings={vault ? () => setTab('reglages') : undefined}
              nav={vault && <NavBar tab={tab} onChange={setTab} />}
            />
          )}
        >
          <PeseesScreen tab={tab} />
        </VaultGate>
      ) : (
        <>
          <AppHeader />
          <main>{user === undefined ? <p>Chargement…</p> : <LoginScreen />}</main>
        </>
      )}
    </ToastProvider>
  )
}
