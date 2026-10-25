import { TABS, type Tab } from './onglets'

const ICONES: Record<Tab, string> = {
  tableau: 'M4 18 9 12l4 3 7-8',
  historique: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  reglages: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
}

/** Navigation principale : barre fixe en bas sur mobile (pouce), en haut sur grand écran. */
export function NavBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="navbar" aria-label="Navigation principale">
      {(Object.keys(TABS) as Tab[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-current={tab === key ? 'page' : undefined}
          onClick={() => onChange(key)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICONES[key]} />
          </svg>
          <span>{TABS[key]}</span>
        </button>
      ))}
    </nav>
  )
}
