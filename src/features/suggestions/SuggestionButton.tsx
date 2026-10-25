import { useMemo, useState, type FormEvent } from 'react'
import type { AuthUser } from '../../core'
import {
  InvalidSuggestionError,
  SuggestionRepository,
  TEXTE_MAX,
  TEXTE_MIN,
  type SuggestionInput,
} from '../../core/suggestions'
import { useServices } from '../../context/ServicesContext'
import { Icone } from '../commun/Icones'
import { MachimotoDit } from '../commun/Mascotte'
import { Modal } from '../shell/Modal'
import { useToast } from '../shell/toast'

/** Bouton 🗨️ du bandeau : envoyer une idée ou signaler un problème (bloc 2.8, D45). */
export function SuggestionButton({ user }: { user: AuthUser }) {
  const { data } = useServices()
  const repo = useMemo(
    () => new SuggestionRepository(data, user.uid, __APP_VERSION__),
    [data, user.uid],
  )
  const [ouvert, setOuvert] = useState(false)
  const [type, setType] = useState<SuggestionInput['type']>('idee')
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const notify = useToast()

  function envoyer(event: FormEvent) {
    event.preventDefault()
    try {
      repo.envoyer({ type, texte }).synced.catch(() => notify('Envoi refusé par le serveur.'))
      notify('Merci ! Suggestion envoyée ✓')
      setTexte('')
      setOuvert(false)
    } catch (error) {
      setErreur(error instanceof InvalidSuggestionError ? error.message : 'Envoi impossible.')
    }
  }

  return (
    <>
      <button
        type="button"
        className="icone bandeau"
        aria-label="Suggérer une idée"
        title="Suggérer une idée"
        onClick={() => {
          setErreur(null)
          setOuvert(true)
        }}
      >
        <Icone nom="bulle" />
      </button>
      {ouvert && (
        <Modal title="Une idée, un problème ?" onClose={() => setOuvert(false)}>
          <form onSubmit={envoyer}>
            <MachimotoDit taille={48}>
              <p>Je t’écoute ! Une idée pour m’améliorer, ou quelque chose qui cloche ?</p>
            </MachimotoDit>
            <div className="row" role="group" aria-label="Type">
              {(
                [
                  ['idee', '💡 Idée'],
                  ['probleme', '🐞 Problème'],
                ] as const
              ).map(([valeur, libelle]) => (
                <button
                  key={valeur}
                  type="button"
                  aria-pressed={type === valeur}
                  onClick={() => setType(valeur)}
                >
                  {libelle}
                </button>
              ))}
            </div>
            <label>
              Ta suggestion
              <textarea
                rows={5}
                minLength={TEXTE_MIN}
                maxLength={TEXTE_MAX}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
              />
            </label>
            <p className="hint">
              ⚠️ Les suggestions ne sont <strong>pas chiffrées</strong> (Maxime les lit) : n’y mets
              pas d’information de santé. Version {__APP_VERSION__} jointe automatiquement.
            </p>
            <button type="submit" className="principal">
              Envoyer
            </button>
            {erreur && <p role="alert">{erreur}</p>}
          </form>
        </Modal>
      )}
    </>
  )
}
