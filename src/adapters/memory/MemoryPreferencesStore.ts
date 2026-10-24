import type { Preferences, PreferencesStore } from '../../core'
import { parsePreferences } from '../../core/prefs/Preferences'

export class MemoryPreferencesStore implements PreferencesStore {
  private preferences: Preferences
  private listeners = new Set<(preferences: Preferences) => void>()

  constructor(initial?: unknown) {
    this.preferences = parsePreferences(initial)
  }

  get() {
    return this.preferences
  }

  set(preferences: Preferences) {
    this.preferences = parsePreferences(preferences)
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
