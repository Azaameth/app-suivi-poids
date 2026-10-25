import { registerSW } from 'virtual:pwa-register'
import type { MiseAJour } from '../../context/MiseAJourContext'

const UNE_HEURE = 60 * 60 * 1000

/**
 * Enregistre le service worker (bloc 2.14) : l'appli s'ouvre ensuite sans réseau. Une nouvelle
 * version déployée est détectée au démarrage puis toutes les heures, et attend l'accord de
 * l'utilisateur (`appliquer`) ; sinon elle s'installe à la prochaine ouverture.
 */
export function creerMiseAJourWeb(): MiseAJour {
  const abonnes = new Set<() => void>()
  let disponible = false
  const activer = registerSW({
    onNeedRefresh() {
      disponible = true
      abonnes.forEach((abonne) => abonne())
    },
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UNE_HEURE)
    },
  })
  return {
    surveiller(onDisponible) {
      abonnes.add(onDisponible)
      if (disponible) onDisponible()
      return () => abonnes.delete(onDisponible)
    },
    appliquer: () => void activer(true),
  }
}
