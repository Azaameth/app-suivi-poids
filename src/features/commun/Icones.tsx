/** Icônes en trait (24 × 24), décoratives : le bouton porte le nom accessible. */
const TRACES = {
  stylo: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  poubelle: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  bulle: 'M4 5h16v11H9l-5 4V5z',
} as const

export function Icone({ nom }: { nom: keyof typeof TRACES }) {
  return (
    <svg className="icone-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d={TRACES[nom]} />
    </svg>
  )
}
