import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../../core'
import { useServices } from '../../context/ServicesContext'
import { MachimotoDit } from '../commun/Mascotte'
import { usePreferences } from '../prefs/usePreferences'
import { Modal } from './Modal'

/**
 * Avatar (initiale du compte Google) et menu : identité, verrouillage, réglages, déconnexion
 * (confirmée, bloc 2.10). Fermeture par Échap ou clic en dehors.
 */
export function ProfileMenu({
  user,
  onLock,
  onSettings,
}: {
  user: AuthUser
  onLock?: () => void
  onSettings?: () => void
}) {
  const { auth } = useServices()
  const [open, setOpen] = useState(false)
  const [depart, setDepart] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const name = user.displayName ?? user.email ?? 'Compte'

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', close)
    window.addEventListener('pointerdown', close)
    return () => {
      window.removeEventListener('keydown', close)
      window.removeEventListener('pointerdown', close)
    }
  }, [open])

  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className="profil" ref={root}>
      <button
        type="button"
        className="avatar"
        aria-label={`Profil de ${name}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {name.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="menu">
          <p className="identite">
            <strong>{name}</strong>
            {user.email && user.email !== name && <span className="hint">{user.email}</span>}
            <span className="hint">Version {__APP_VERSION__}</span>
          </p>
          {onLock && (
            <button type="button" onClick={run(onLock)}>
              🔒 Verrouiller
            </button>
          )}
          {onSettings && (
            <button type="button" onClick={run(onSettings)}>
              ⚙️ Réglages
            </button>
          )}
          <button type="button" onClick={run(() => setDepart(true))}>
            🚪 Se déconnecter
          </button>
        </div>
      )}
      {depart && <Depart onPartir={() => void auth.signOut()} onRester={() => setDepart(false)} />}
    </div>
  )
}

/** Confirmation de départ : Machimoto triste, et ce que la déconnexion efface. */
function Depart({ onPartir, onRester }: { onPartir: () => void; onRester: () => void }) {
  const { data } = useServices()
  const [preferences] = usePreferences()
  const [enAttente, setEnAttente] = useState(0)
  useEffect(() => data.watchSyncState((_, pending) => setEnAttente(pending)), [data])

  return (
    <Modal title="Se déconnecter" onClose={onRester}>
      <MachimotoDit expression="triste">
        <p>Tu t’en vas déjà ? À bientôt, j’espère !</p>
      </MachimotoDit>
      <p className="hint">
        Ta phrase secrète te sera redemandée à la prochaine connexion.
        {preferences.horsLigne && ' La copie de tes données sur cet appareil sera effacée.'}
      </p>
      {enAttente > 0 && (
        <p role="alert">
          {enAttente} modification{enAttente > 1 ? 's' : ''} pas encore envoyée
          {enAttente > 1 ? 's' : ''} : retrouve le réseau avant de partir, sinon elle
          {enAttente > 1 ? 's seront perdues' : ' sera perdue'}.
        </p>
      )}
      <div className="row">
        <button type="button" className="principal" onClick={onPartir}>
          🚪 Se déconnecter
        </button>
        <button type="button" onClick={onRester}>
          Rester
        </button>
      </div>
    </Modal>
  )
}
