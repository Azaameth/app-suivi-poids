import type { ReactNode } from 'react'
import type { Ton } from '../../core/analyse'

/**
 * Tuile du tableau de bord : l'information est portée par le texte. Avec un objectif, un
 * accent sobre indique si le mouvement va vers lui (§ 5.3) ; jamais la couleur seule.
 */
export function Tuile({
  titre,
  valeur,
  detail,
  ton,
}: {
  titre: string
  valeur: ReactNode
  detail?: ReactNode
  ton?: Ton | null
}) {
  return (
    <section className={ton ? `tuile ${ton}` : 'tuile'} aria-label={titre}>
      <h3>{titre}</h3>
      <p className="valeur">{valeur}</p>
      {detail && <p className="hint">{detail}</p>}
    </section>
  )
}
