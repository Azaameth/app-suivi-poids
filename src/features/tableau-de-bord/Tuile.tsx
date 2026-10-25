import type { ReactNode } from 'react'

/** Tuile du tableau de bord : couleurs neutres, l'information est portée par le texte. */
export function Tuile({
  titre,
  valeur,
  detail,
}: {
  titre: string
  valeur: ReactNode
  detail?: ReactNode
}) {
  return (
    <section className="tuile" aria-label={titre}>
      <h3>{titre}</h3>
      <p className="valeur">{valeur}</p>
      {detail && <p className="hint">{detail}</p>}
    </section>
  )
}
