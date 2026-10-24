import { useCallback, useEffect, useState } from 'react'
import type { Preferences } from '../../core'
import { useServices } from '../../context/ServicesContext'

/** Préférences courantes et fonction de mise à jour (persistées par le PreferencesStore). */
export function usePreferences(): [Preferences, (change: Partial<Preferences>) => void] {
  const { prefs } = useServices()
  const [preferences, setPreferences] = useState(() => prefs.get())
  useEffect(() => prefs.watch(setPreferences), [prefs])
  const update = useCallback(
    (change: Partial<Preferences>) => prefs.set({ ...prefs.get(), ...change }),
    [prefs],
  )
  return [preferences, update]
}
