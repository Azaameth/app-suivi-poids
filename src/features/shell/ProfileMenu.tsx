import { useEffect, useRef, useState } from 'react'
import type { AuthUser } from '../../core'
import { useServices } from '../../context/ServicesContext'

/**
 * Avatar (initiale du compte Google) et menu : identité, verrouillage, réglages, déconnexion.
 * Fermeture par Échap ou clic en dehors.
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
          <button type="button" onClick={run(() => void auth.signOut())}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
