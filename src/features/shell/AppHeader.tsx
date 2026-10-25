import type { ReactNode } from 'react'
import type { AuthUser } from '../../core'
import { SuggestionButton } from '../suggestions/SuggestionButton'
import { SyncIndicator } from '../sync/SyncIndicator'
import { Mascotte } from '../commun/Mascotte'
import { ProfileMenu } from './ProfileMenu'

/**
 * Bandeau du haut : nom de l'appli, état de synchro, profil, et navigation (`nav`). Une seule
 * zone collante et opaque : le contenu ne se voit jamais défiler dessous (bloc 2.7).
 * Sur mobile, la navigation est sortie du bandeau et fixée en bas (CSS).
 */
export function AppHeader({
  user,
  onLock,
  onSettings,
  nav,
}: {
  user?: AuthUser | null
  onLock?: () => void
  onSettings?: () => void
  nav?: ReactNode
}) {
  return (
    <header className="app-header">
      <div className="barre-haut">
        <h1>
          <Mascotte taille={30} />
          Professeur Machimoto
        </h1>
        {user && (
          <div className="row">
            <SyncIndicator />
            <SuggestionButton user={user} />
            <ProfileMenu user={user} onLock={onLock} onSettings={onSettings} />
          </div>
        )}
      </div>
      {nav}
    </header>
  )
}
