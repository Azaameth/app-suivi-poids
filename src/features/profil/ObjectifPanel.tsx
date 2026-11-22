import { useState, type FormEvent } from 'react'
import { TOLERANCE } from '../../core/analyse'
import {
  InvalidProfilError,
  TAILLE_CM,
  type Profil,
  type ProfilInput,
  type ProfilRepository,
  type Usage,
} from '../../core/profil'
import { formatFixed } from '../commun/format'
import { useToast } from '../shell/toast'

const USAGES: { valeur: Usage | null; libelle: string }[] = [
  { valeur: null, libelle: 'Aucun' },
  { valeur: 'perdre', libelle: 'Perdre' },
  { valeur: 'gagner', libelle: 'Gagner' },
  { valeur: 'maintenir', libelle: 'Maintenir' },
]

const TOLERANCES = Array.from(
  { length: Math.round((TOLERANCE.max - TOLERANCE.min) / TOLERANCE.pas) + 1 },
  (_, i) => TOLERANCE.min + i * TOLERANCE.pas,
)

/** « 72,5 » ou « 72.5 » → 72.5 ; vide → undefined ; illisible → NaN. */
function lireNombre(texte: string): number | undefined {
  const t = texte.trim().replace(',', '.')
  return t === '' ? undefined : Number(t)
}

const enTexte = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

/** Réglages → Objectif (v1.1) : usage, cible, tolérance, taille. Chiffré comme les pesées. */
export function ObjectifPanel({ profil, repo }: { profil: Profil | null; repo: ProfilRepository }) {
  // Le formulaire repart du profil enregistré à chaque changement (autre appareil compris).
  return <Formulaire key={profil?.updatedAt ?? 0} profil={profil} repo={repo} />
}

function Formulaire({ profil, repo }: { profil: Profil | null; repo: ProfilRepository }) {
  const notify = useToast()
  const [usage, setUsage] = useState<Usage | null>(profil?.usage ?? null)
  const [cible, setCible] = useState(enTexte(profil?.cible))
  const [tolerance, setTolerance] = useState<number>(profil?.tolerance ?? TOLERANCE.defaut)
  const [taille, setTaille] = useState(enTexte(profil?.taille))
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  async function enregistrer(event: FormEvent) {
    event.preventDefault()
    setErreur(null)
    const valeurCible = lireNombre(cible)
    const valeurTaille = lireNombre(taille)
    if (usage && (valeurCible === undefined || Number.isNaN(valeurCible) || valeurCible <= 0)) {
      return setErreur('Indique le poids visé, en kg.')
    }
    if (
      valeurTaille !== undefined &&
      (Number.isNaN(valeurTaille) || valeurTaille < TAILLE_CM.min || valeurTaille > TAILLE_CM.max)
    ) {
      return setErreur(`Taille en centimètres, entre ${TAILLE_CM.min} et ${TAILLE_CM.max}.`)
    }
    const input: ProfilInput = {
      usage,
      ...(usage && { cible: valeurCible }),
      ...(usage === 'maintenir' && { tolerance }),
      ...(valeurTaille !== undefined && { taille: valeurTaille }),
    }
    setOccupe(true)
    try {
      const { synced } = await repo.save(input)
      notify(usage ? 'Objectif enregistré' : 'Profil enregistré')
      synced.catch(() => setErreur('Le serveur a refusé l’enregistrement.'))
    } catch (e) {
      setErreur(
        e instanceof InvalidProfilError ? 'Valeurs invalides.' : 'Enregistrement impossible.',
      )
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="card" aria-labelledby="objectif-titre">
      <h2 id="objectif-titre">🎯 Objectif</h2>
      <form onSubmit={enregistrer} className="objectif">
        <p id="usage-libelle">Je veux…</p>
        <div className="segments" role="group" aria-labelledby="usage-libelle">
          {USAGES.map(({ valeur, libelle }) => (
            <button
              key={libelle}
              type="button"
              aria-pressed={usage === valeur}
              onClick={() => setUsage(valeur)}
            >
              {libelle}
            </button>
          ))}
        </div>
        {usage && (
          <label>
            {usage === 'maintenir' ? 'Poids à maintenir (kg)' : 'Poids visé (kg)'}
            <input
              inputMode="decimal"
              value={cible}
              onChange={(e) => setCible(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
        {usage === 'maintenir' && (
          <label>
            Zone acceptée
            <select value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))}>
              {TOLERANCES.map((t) => (
                <option key={t} value={t}>
                  ± {formatFixed(t)} kg
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Taille (cm, facultatif)
          <input
            inputMode="numeric"
            value={taille}
            onChange={(e) => setTaille(e.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="hint">
          La taille sert seulement à l’IMC (repères de l’OMS pour les adultes). Le poids visé et la
          taille sont chiffrés comme tes pesées.
        </p>
        {erreur && <p role="alert">{erreur}</p>}
        <button type="submit" className="principal" disabled={occupe}>
          Enregistrer
        </button>
      </form>
    </section>
  )
}
