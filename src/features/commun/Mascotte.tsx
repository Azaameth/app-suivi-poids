import type { ReactNode } from 'react'
import content from '../../assets/machimoto.svg'
import pensif from '../../assets/machimoto-pensif.svg'
import ravi from '../../assets/machimoto-ravi.svg'
import triste from '../../assets/machimoto-triste.svg'

/**
 * Expressions (bloc 2.10) : content par défaut, ravi pour une étape réussie, pensif pendant une
 * attente, triste au départ ou sur une erreur. Jamais pour juger une pesée (D33).
 */
export type Expression = 'content' | 'ravi' | 'pensif' | 'triste'

const DESSINS: Record<Expression, string> = { content, ravi, pensif, triste }

/** Professeur Machimoto, la mascotte (dessin original). Décorative : le texte voisin informe. */
export function Mascotte({
  taille,
  expression = 'content',
}: {
  taille: number
  expression?: Expression
}) {
  return (
    <img
      className="mascotte"
      src={DESSINS[expression]}
      alt=""
      width={taille}
      height={taille}
      data-expression={expression}
    />
  )
}

/** Machimoto qui parle : la mascotte et une bulle de texte (le texte porte l'information). */
export function MachimotoDit({
  expression,
  taille = 64,
  children,
}: {
  expression?: Expression
  taille?: number
  children: ReactNode
}) {
  return (
    <div className="machimoto-dit">
      <Mascotte taille={taille} expression={expression} />
      <div className="bulle-texte">{children}</div>
    </div>
  )
}
