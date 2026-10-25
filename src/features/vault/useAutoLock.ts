import { useEffect } from 'react'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * Appelle `onIdle` après `timeoutMs` sans clic, frappe ni défilement. Le délai vient des
 * préférences (D12, 5 min par défaut).
 */
export function useAutoLock(onIdle: () => void, timeoutMs: number) {
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
