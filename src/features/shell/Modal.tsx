import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Fenêtre modale légère : titre annoncé, fermeture par Échap ou clic sur le fond, focus placé
 * sur le premier champ à l'ouverture et rendu à l'élément d'origine à la fermeture.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('input:not([disabled]), button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-fond" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
        <header className="row espace">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icone" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
