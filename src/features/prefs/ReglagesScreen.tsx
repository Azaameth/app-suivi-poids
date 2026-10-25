import type { Pesee, PeseeRepository } from '../../core/pesees'
import { SupprimerCompte } from '../compte/SupprimerCompte'
import { DevTools } from '../dev/DevTools'
import { ExportPanel } from '../pesees/ExportPanel'
import { SettingsPanel } from './SettingsPanel'

/** Réglages : export CSV, verrouillage, phrase secrète (+ outils de dev en développement). */
export function ReglagesScreen({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  return (
    <>
      <ExportPanel pesees={pesees} />
      <SettingsPanel />
      <SupprimerCompte />
      {import.meta.env.DEV && <DevTools pesees={pesees} repo={repo} />}
    </>
  )
}
