import { AUTO_LOCK_CHOICES } from '../../core/prefs/Preferences'
import { VaultSettings } from '../vault/VaultSettings'
import { usePreferences } from './usePreferences'

export function SettingsPanel() {
  const [preferences, update] = usePreferences()
  return (
    <section className="card">
      <h2>Paramètres</h2>
      <label>
        Verrouillage automatique après
        <select
          value={preferences.autoLockMinutes}
          onChange={(e) => update({ autoLockMinutes: Number(e.target.value) })}
        >
          {AUTO_LOCK_CHOICES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min d’inactivité
            </option>
          ))}
        </select>
      </label>
      <VaultSettings />
    </section>
  )
}
