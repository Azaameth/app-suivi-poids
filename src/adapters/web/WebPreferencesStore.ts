import type { Preferences, PreferencesStore } from '../../core'
import { parsePreferences } from '../../core/prefs/Preferences'

const STORAGE_KEY = 'machimoto.preferences'

/**
 * Préférences d'affichage dans localStorage (propres à l'appareil, rien de secret).
 * Stockage indisponible (navigation privée, quota) : on continue avec les valeurs en mémoire.
 */
export class WebPreferencesStore implements PreferencesStore {
  private preferences: Preferences
  private listeners = new Set<(preferences: Preferences) => void>()

  constructor() {
    this.preferences = parsePreferences(read())
  }

  get() {
    return this.preferences
  }

  set(preferences: Preferences) {
    this.preferences = parsePreferences(preferences)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
    } catch {
      // Préférences non persistées : sans conséquence.
    }
    this.listeners.forEach((listener) => listener(this.preferences))
  }

  watch(listener: (preferences: Preferences) => void) {
    this.listeners.add(listener)
    listener(this.preferences)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

/** Préférences stockées (ou valeurs par défaut), lisibles avant toute initialisation. */
export function preferencesStockees(): Preferences {
  return parsePreferences(read())
}

function read(): unknown {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}
