import { useCallback, useState, type ReactNode } from 'react'
import { ToastContext, type Notifier } from './toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])
  const notify = useCallback<Notifier>((message) => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list, { id, message }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3000)
  }, [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {/* aria-live sans role="status" : l'indicateur de synchro garde ce rôle. */}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className="toast">
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
