import machimoto from '../../assets/machimoto.svg'

/** Professeur Machimoto, la mascotte (dessin original). Décorative : le texte voisin informe. */
export function Mascotte({ taille }: { taille: number }) {
  return <img className="mascotte" src={machimoto} alt="" width={taille} height={taille} />
}
