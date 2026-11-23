import type { Pesee, PeseeRepository } from '../../core/pesees'
import { SupprimerCompte } from '../compte/SupprimerCompte'
import { DevTools } from '../dev/DevTools'
import { ExportPanel } from '../pesees/ExportPanel'
import { ImportPanel } from '../pesees/ImportPanel'
import { ObjectifPanel } from '../profil/ObjectifPanel'
import type { useProfil } from '../profil/useProfil'
import { SettingsPanel } from './SettingsPanel'

/**
 * Réglages : objectif, export et import CSV, verrouillage, phrase secrète (+ outils de dev en
 * développement).
 */
export function ReglagesScreen({
  pesees,
  repo,
  profil,
}: {
  pesees: Pesee[]
  repo: PeseeRepository
  profil?: ReturnType<typeof useProfil>
}) {
  return (
    <>
      {profil?.state.status === 'ready' && (
        <ObjectifPanel profil={profil.state.profil} repo={profil.repo} />
      )}
      {profil?.state.status === 'error' && (
        <p role="alert">
          Ton objectif est illisible pour le moment ; tes pesées ne sont pas touchées.
        </p>
      )}
      <ExportPanel pesees={pesees} />
      <ImportPanel pesees={pesees} repo={repo} />
      <SettingsPanel />
      <SupprimerCompte />
      {import.meta.env.MODE !== 'production' && <DevTools pesees={pesees} repo={repo} />}
    </>
  )
}
