import { useEffect, useState } from 'react'
import type { SyncState } from '../../core'
import { supprimerCompte } from '../../core/compte/supprimerCompte'
import { useServices } from '../../context/ServicesContext'
import { Icone } from '../commun/Icones'
import { MachimotoDit } from '../commun/Mascotte'
import { useUnlockedVault } from '../vault/VaultContext'

const MOT = 'SUPPRIMER'

/** « Supprimer mon compte et mes données » (D47) : confirmation forte, réseau obligatoire. */
export function SupprimerCompte() {
  const services = useServices()
  const { uid } = useUnlockedVault()
  const [ouvert, setOuvert] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncState>('online')
  useEffect(() => services.data.watchSyncState(setSync), [services.data])
  const horsLigne = sync === 'offline'

  async function confirmer() {
    setEnCours(true)
    setErreur(null)
    try {
      await supprimerCompte(services, uid)
      // La déconnexion qui suit ramène à l'écran de connexion.
    } catch {
      setErreur('Suppression interrompue. Vérifie le réseau puis réessaie : rien n’est perdu.')
      setEnCours(false)
    }
  }

  return (
    <section className="card zone-sensible">
      <h2>Supprimer mon compte</h2>
      <p className="hint">
        Efface définitivement toutes tes pesées, tes suggestions, ta clé chiffrée et ton compte.
        Pense à exporter tes données avant.
      </p>
      {!ouvert ? (
        <button type="button" className="danger" onClick={() => setOuvert(true)}>
          <Icone nom="poubelle" /> Supprimer mon compte et mes données
        </button>
      ) : (
        <>
          <MachimotoDit expression="triste">
            <p>Tu pars pour de bon ? Ça me rend triste, mais c’est ton choix.</p>
            <p>
              Exporte d’abord tes pesées (Export CSV, en haut de cet écran) : une fois supprimées,
              même moi je ne pourrai pas les retrouver.
            </p>
          </MachimotoDit>
          <label>
            Pour confirmer, tape {MOT}
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="danger-plein"
              disabled={saisie !== MOT || enCours || horsLigne}
              onClick={confirmer}
            >
              {enCours ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <button type="button" onClick={() => setOuvert(false)} disabled={enCours}>
              Annuler
            </button>
          </div>
          {horsLigne && <p className="hint">Connexion nécessaire pour supprimer le compte.</p>}
        </>
      )}
      {erreur && <p role="alert">{erreur}</p>}
    </section>
  )
}
