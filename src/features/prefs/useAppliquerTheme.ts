import { useEffect } from 'react'
import type { Theme } from '../../core/prefs/Preferences'
import { usePreferences } from './usePreferences'

/** Couleur de la barre du navigateur mobile, par thème (= fond du bandeau). */
const BARRE: Record<Exclude<Theme, 'systeme'>, string> = { clair: '#f6f3f9', sombre: '#2b2930' }

/**
 * Applique le thème choisi (D41) : `data-theme` sur <html> pour les jetons CSS, et la couleur
 * de la barre du navigateur. « Système » rend la main à `prefers-color-scheme`.
 */
export function useAppliquerTheme() {
  const [{ theme }] = usePreferences()
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'systeme') delete html.dataset.theme
    else html.dataset.theme = theme
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.media.includes('dark') ? 'sombre' : 'clair'
      meta.content = BARRE[theme === 'systeme' ? media : theme]
    })
  }, [theme])
}
