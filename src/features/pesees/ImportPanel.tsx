import { useMemo, useState, type ChangeEvent } from 'react'
import { signalerImprobables } from '../../core/analyse'
import {
  lireCsv,
  planifierImport,
  type LectureCsv,
  type Pesee,
  type PeseeRepository,
} from '../../core/pesees'
import { formatDay, formatWeight } from '../commun/format'
import { messageAvis } from '../commun/plausibilite'

const APERCU_MAX = 10

/**
 * Import CSV (#39) : aperçu avant écriture (nouvelles, différentes, identiques, lignes
 * ignorées, saisies improbables D35), puis chaque pesée est chiffrée comme une saisie.
 */
export function ImportPanel({ pesees, repo }: { pesees: Pesee[]; repo: PeseeRepository }) {
  const [fichier, setFichier] = useState<{ nom: string; lecture: LectureCsv } | null>(null)
  const [remplacer, setRemplacer] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const plan = useMemo(
    () => (fichier ? planifierImport(fichier.lecture.pesees, pesees) : null),
    [fichier, pesees],
  )

  // Saisies improbables parmi les pesées importées, jugées avec l'historique fusionné.
  const improbables = useMemo(() => {
    if (!fichier) return []
    const parDate = new Map(pesees.map((p) => [p.date, p.poids]))
    for (const p of fichier.lecture.pesees) parDate.set(p.date, p.poids)
    const fusion = [...parDate].map(([date, poids]) => ({ date, poids }))
    const avis = signalerImprobables(fusion.sort((a, b) => a.date.localeCompare(b.date)))
    return fichier.lecture.pesees.flatMap((p) => {
      const a = avis.get(p.date)
      return a ? [{ date: p.date, avis: a }] : []
    })
  }, [fichier, pesees])

  async function choisir(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    setRemplacer(false)
    setFichier({ nom: file.name, lecture: lireCsv(await file.text()) })
  }

  async function importer() {
    if (!plan) return
    const aEcrire = [
      ...plan.nouvelles.map((input) => ({ input, existante: undefined })),
      ...(remplacer
        ? plan.differentes.map((d) => ({ input: d.import, existante: d.existante }))
        : []),
    ]
    setEnCours(true)
    try {
      const ecritures = []
      for (const { input, existante } of aEcrire) {
        ecritures.push((await repo.save(input, existante)).synced)
      }
      setFichier(null)
      setEnCours(false)
      setMessage(`${aEcrire.length} pesée(s) importée(s), envoi au serveur…`)
      const refus = (await Promise.allSettled(ecritures)).filter((r) => r.status === 'rejected')
      setMessage(
        refus.length
          ? `${refus.length} pesée(s) refusée(s) par le serveur.`
          : `${aEcrire.length} pesée(s) importée(s) ✓`,
      )
    } catch {
      setMessage('Import interrompu : les pesées déjà écrites sont conservées.')
    } finally {
      setEnCours(false)
    }
  }

  const nombre = plan ? plan.nouvelles.length + (remplacer ? plan.differentes.length : 0) : 0
  const lues = fichier?.lecture.pesees ?? []

  return (
    <section className="card">
      <h2>Import CSV</h2>
      <p className="hint">
        Colonnes : date (2026-10-25 ou 25/10/2026), poids en kg, note facultative. Un export de
        l’appli se réimporte tel quel. Rien n’est écrit avant ta confirmation.
      </p>
      <label className="bouton-fichier">
        Choisir un fichier CSV
        <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={choisir} />
      </label>

      {fichier && plan && (
        <div className="apercu-import" aria-label="Aperçu de l’import">
          <p>
            <strong>{fichier.nom}</strong> : {lues.length} pesée(s) reconnue(s)
            {lues.length > 0 &&
              ` (du ${formatDay(lues[0].date)} au ${formatDay(lues[lues.length - 1].date)})`}
            .
          </p>
          <ul>
            <li>{plan.nouvelles.length} nouvelle(s)</li>
            {plan.identiques > 0 && <li>{plan.identiques} déjà présente(s) à l’identique</li>}
            {plan.differentes.length > 0 && (
              <li>
                {plan.differentes.length} déjà présente(s) avec une autre valeur :
                <ul>
                  {plan.differentes.slice(0, APERCU_MAX).map((d) => (
                    <li key={d.import.date}>
                      {formatDay(d.import.date)} : {formatWeight(d.existante.poids)} →{' '}
                      {formatWeight(d.import.poids)}
                    </li>
                  ))}
                </ul>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={remplacer}
                    onChange={(e) => setRemplacer(e.target.checked)}
                  />
                  Remplacer par les valeurs du fichier
                </label>
              </li>
            )}
            {fichier.lecture.doublons.length > 0 && (
              <li>
                {fichier.lecture.doublons.length} date(s) en double dans le fichier : la dernière
                ligne est gardée
              </li>
            )}
          </ul>
          {fichier.lecture.ignorees.length > 0 && (
            <>
              <p>{fichier.lecture.ignorees.length} ligne(s) ignorée(s) :</p>
              <ul className="hint">
                {fichier.lecture.ignorees.slice(0, APERCU_MAX).map((i) => (
                  <li key={i.ligne}>
                    ligne {i.ligne} : {i.raison}
                  </li>
                ))}
              </ul>
            </>
          )}
          {improbables.length > 0 && (
            <>
              <p className="avertissement">Saisie(s) improbable(s), à vérifier :</p>
              <ul className="hint">
                {improbables.slice(0, APERCU_MAX).map(({ date, avis }) => (
                  <li key={date}>
                    {formatDay(date)} : {messageAvis(avis)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="row">
            <button
              type="button"
              className="principal"
              disabled={nombre === 0 || enCours}
              onClick={importer}
            >
              {enCours ? 'Import…' : `Importer ${nombre} pesée(s)`}
            </button>
            <button type="button" onClick={() => setFichier(null)} disabled={enCours}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
