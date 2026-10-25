import { AUTO_LOCK_CHOICES, THEMES, type Theme } from '../../core/prefs/Preferences'
import { VaultSettings } from '../vault/VaultSettings'
import { usePreferences } from './usePreferences'

const LIBELLES: Record<Theme, string> = { systeme: 'Système', clair: 'Clair', sombre: 'Sombre' }

export function SettingsPanel() {
  const [preferences, update] = usePreferences()
  return (
    <section className="card">
      <h2>Paramètres</h2>
      <p id="theme-libelle">Thème</p>
      <div className="row" role="group" aria-labelledby="theme-libelle">
        {THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={preferences.theme === theme}
            onClick={() => update({ theme })}
          >
            {LIBELLES[theme]}
          </button>
        ))}
      </div>
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
