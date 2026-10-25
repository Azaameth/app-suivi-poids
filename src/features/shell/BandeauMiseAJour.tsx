import { useEffect, useState } from 'react'
import { useMiseAJour } from '../../context/MiseAJourContext'

/**
 * « Nouvelle version disponible » (bloc 2.14) : proposée, jamais imposée, car recharger
 * reverrouille le coffre. Sans action, elle s'installe à la prochaine ouverture.
 */
export function BandeauMiseAJour() {
  const miseAJour = useMiseAJour()
  const [disponible, setDisponible] = useState(false)
  const [masque, setMasque] = useState(false)
  useEffect(() => miseAJour.surveiller(() => setDisponible(true)), [miseAJour])

  if (!disponible || masque) return null
  return (
    <div className="bandeau-mise-a-jour" role="status">
      <span>Nouvelle version de Machimoto disponible (ta phrase te sera redemandée).</span>
      <button type="button" className="principal" onClick={() => miseAJour.appliquer()}>
        Mettre à jour
      </button>
      <button type="button" onClick={() => setMasque(true)}>
        Plus tard
      </button>
    </div>
  )
}
