import type { AuthUser } from '../../core'
import { SyncIndicator } from '../sync/SyncIndicator'
import { ProfileMenu } from './ProfileMenu'

/** Bandeau du haut : nom de l'appli, état de synchro, profil. */
export function AppHeader({
  user,
  onLock,
  onSettings,
}: {
  user?: AuthUser | null
  onLock?: () => void
  onSettings?: () => void
}) {
  return (
    <header className="app-header">
      <h1>Professeur Machimoto</h1>
      {user && (
        <div className="row">
          <SyncIndicator />
          <ProfileMenu user={user} onLock={onLock} onSettings={onSettings} />
        </div>
      )}
    </header>
  )
}
