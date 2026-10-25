import { useState } from 'react'
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
      <HorsLigne actif={preferences.horsLigne} onChange={(horsLigne) => update({ horsLigne })} />
      <VaultSettings />
    </section>
  )
}

/**
 * « Garder mes données sur cet appareil » (D49) : copie locale chiffrée pour démarrer hors
 * ligne. Le cache Firestore se choisit au démarrage : changement appliqué au rechargement.
 */
function HorsLigne({ actif, onChange }: { actif: boolean; onChange: (actif: boolean) => void }) {
  const [initial] = useState(actif)
  return (
    <div className="hors-ligne">
      <label className="inline">
        <input type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} />
        Garder mes données sur cet appareil (hors ligne)
      </label>
      <p className="hint">
        Permet d’ouvrir l’appli sans réseau. La copie est chiffrée comme sur le serveur (seules les
        dates sont lisibles) et effacée à la déconnexion. Désactive sur un ordinateur partagé.
      </p>
      {actif !== initial && (
        <p role="status">
          Pris en compte au prochain chargement.{' '}
          <button type="button" className="lien" onClick={() => location.reload()}>
            Recharger maintenant
          </button>
        </p>
      )}
    </div>
  )
}
