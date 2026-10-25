import type { Pesee, PeseeRepository } from '../../core/pesees'
import { SupprimerCompte } from '../compte/SupprimerCompte'
import { DevTools } from '../dev/DevTools'
import { ExportPanel } from '../pesees/ExportPanel'
import { ImportPanel } from '../pesees/ImportPanel'
import { SettingsPanel } from './SettingsPanel'

/** Réglages : export et import CSV, verrouillage, phrase secrète (+ outils de dev en développement). */
export function ReglagesScreen({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  return (
    <>
      <ExportPanel pesees={pesees} />
      <ImportPanel pesees={pesees} repo={repo} />
      <SettingsPanel />
      <SupprimerCompte />
      {import.meta.env.DEV && <DevTools pesees={pesees} repo={repo} />}
    </>
  )
}
