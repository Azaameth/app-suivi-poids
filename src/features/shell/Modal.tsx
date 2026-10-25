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
  // Dernière version de onClose, sans relancer l'effet d'ouverture (souvent une fonction
  // recréée à chaque rendu : la relancer replaçait le focus à chaque lettre tapée).
  const fermer = useRef(onClose)
  useEffect(() => {
    fermer.current = onClose
  }, [onClose])

  // À l'ouverture seulement : focus sur le premier champ de saisie (sinon le premier bouton).
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const champ =
      panel.current?.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ) ?? panel.current?.querySelector<HTMLElement>('button')
    champ?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fermer.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [])

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
