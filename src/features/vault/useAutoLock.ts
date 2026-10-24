import { useEffect } from 'react'

/** 5 minutes d'inactivité (D12). */
export const AUTO_LOCK_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** Appelle `onIdle` après `timeoutMs` sans clic, frappe ni défilement. */
export function useAutoLock(onIdle: () => void, timeoutMs = AUTO_LOCK_MS) {
  useEffect(() => {
    let timer = setTimeout(onIdle, timeoutMs)
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(onIdle, timeoutMs)
    }
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    return () => {
      clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [onIdle, timeoutMs])
}
