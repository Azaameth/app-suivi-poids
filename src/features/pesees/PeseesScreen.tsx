import { lazy, Suspense, useState } from 'react'
import { Modal } from '../shell/Modal'
import { NavBar } from '../shell/NavBar'
import { TABS, type Tab } from '../shell/onglets'
import { useToast } from '../shell/toast'
import { SaisieDuJour } from '../tableau-de-bord/SaisiePesee'
import { TableauDeBord } from '../tableau-de-bord/TableauDeBord'
import { usePesees } from './usePesees'

// Écrans secondaires chargés à la demande (#29) : le tableau de bord s'affiche sans les attendre.
const HistoriqueScreen = lazy(() =>
  import('./HistoriqueScreen').then((m) => ({ default: m.HistoriqueScreen })),
)
const ReglagesScreen = lazy(() =>
  import('../prefs/ReglagesScreen').then((m) => ({ default: m.ReglagesScreen })),
)

/** Écran principal, coffre déverrouillé : contenu de l'onglet, navigation, saisie du jour. */
export function PeseesScreen({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const { state, repo } = usePesees()
  const [saisie, setSaisie] = useState(false)
  const [removeError, setRemoveError] = useState(false)
  const notify = useToast()

  function remove(date: string) {
    setRemoveError(false)
    notify('Pesée supprimée')
    repo.remove(date).synced.catch(() => setRemoveError(true))
  }

  return (
    <>
      <NavBar tab={tab} onChange={onTab} />
      <h2 className="titre-ecran">{TABS[tab]}</h2>

      {state.status === 'loading' && <p>Chargement des pesées…</p>}
      {state.status === 'error' && (
        <p role="alert">Impossible de charger les pesées. Vérifie la connexion puis recharge.</p>
      )}
      {state.status === 'ready' && (
        <>
          {state.unreadable && (
            <p role="alert">Certaines pesées sont illisibles (donnée altérée) et sont masquées.</p>
          )}
          {removeError && <p role="alert">Le serveur a refusé la suppression.</p>}
          <Suspense fallback={<p>Chargement…</p>}>
            {tab === 'tableau' && (
              <TableauDeBord pesees={state.pesees} onSaisir={() => setSaisie(true)} />
            )}
            {tab === 'historique' && (
              <HistoriqueScreen pesees={state.pesees} repo={repo} onRemove={remove} />
            )}
            {tab === 'reglages' && <ReglagesScreen pesees={state.pesees} repo={repo} />}
          </Suspense>

          {tab === 'tableau' && (
            <button
              type="button"
              className="fab"
              aria-label="Saisir la pesée du jour"
              onClick={() => setSaisie(true)}
            >
              +
            </button>
          )}
          {saisie && (
            <Modal title="Pesée du jour" onClose={() => setSaisie(false)}>
              <SaisieDuJour pesees={state.pesees} repo={repo} onDone={() => setSaisie(false)} />
            </Modal>
          )}
        </>
      )}
    </>
  )
}
