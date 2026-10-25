import { createContext, useContext } from 'react'

export type Notifier = (message: string) => void

export const ToastContext = createContext<Notifier>(() => {})

/** Confirmation brève après une action (« Pesée enregistrée ✓ »). Sans fournisseur : rien. */
export function useToast(): Notifier {
  return useContext(ToastContext)
}
