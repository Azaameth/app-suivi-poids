import { NOTE_MAX, POIDS_MAX, POIDS_MIN, type Pesee } from './model'
import type { PeseeInput } from './repository'

export interface LigneIgnoree {
  /** Numéro de ligne dans le fichier (1 = première ligne). */
  ligne: number
  raison: string
}

export interface LectureCsv {
  /** Pesées reconnues, triées par date ; une seule par jour (la dernière du fichier). */
  pesees: PeseeInput[]
  ignorees: LigneIgnoree[]
  /** Dates présentes plusieurs fois dans le fichier (seule la dernière est gardée). */
  doublons: string[]
}

/** Découpe une ligne CSV (guillemets RFC 4180 compris). */
function champs(ligne: string, separateur: string): string[] {
  const resultat: string[] = []
  let courant = ''
  let guillemets = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (guillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        courant += '"'
        i++
      } else if (c === '"') guillemets = false
      else courant += c
    } else if (c === '"') guillemets = true
    else if (c === separateur) {
      resultat.push(courant)
      courant = ''
    } else courant += c
  }
  resultat.push(courant)
  return resultat.map((champ) => champ.trim())
}

/** `2026-10-25` ou `25/10/2026` (aussi `25-10-2026`, `25.10.2026`) → `2026-10-25`. */
function lireDate(valeur: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur)
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(valeur)
  const parties = iso ? [iso[1], iso[2], iso[3]] : fr ? [fr[3], fr[2], fr[1]] : null
  if (!parties) return null
  const [a, m, j] = parties
  const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`
  const d = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date ? date : null
}

/** `137,7`, `137.7`, `137,7 kg` → 137.7 ; null si illisible. */
function lirePoids(valeur: string): number | null {
  const nettoye = valeur.replace(/\s*kg$/i, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(nettoye)) return null
  return Number(nettoye)
}

/**
 * Lit un CSV de pesées : colonnes date, poids (kg), note facultative. Séparateur `;`,
 * tabulation ou `,` (détecté) ; l'export de l'appli (D28) se relit tel quel. Une première
 * ligne sans date est prise pour un en-tête. Rien n'est bloquant : les lignes illisibles
 * sont listées dans `ignorees`.
 */
export function lireCsv(texte: string): LectureCsv {
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/)
  const premiere = lignes.find((l) => l.trim()) ?? ''
  const separateur = premiere.includes(';') ? ';' : premiere.includes('\t') ? '\t' : ','
  // Notre export (D28) protège déjà ses champs : pas de virgule décimale à deviner.
  const exportAppli = premiere.trim() === 'date,poids_kg,note'
  const parDate = new Map<string, PeseeInput>()
  const doublons = new Set<string>()
  const ignorees: LigneIgnoree[] = []
  let enTetePossible = true

  lignes.forEach((brute, index) => {
    if (!brute.trim()) return
    const ligne = index + 1
    const valeurs = champs(brute, separateur)
    // `2026-10-25,137,7` : virgule décimale non protégée, pas une note « 7 ».
    if (
      separateur === ',' &&
      !exportAppli &&
      valeurs.length === 3 &&
      /^\d+$/.test(valeurs[1]) &&
      /^\d+$/.test(valeurs[2])
    ) {
      valeurs.splice(1, 2, `${valeurs[1]}.${valeurs[2]}`)
    }
    const [dateBrute = '', poidsBrut = '', noteBrute = ''] = valeurs
    const date = lireDate(dateBrute)
    if (enTetePossible) {
      enTetePossible = false
      if (!date && lirePoids(poidsBrut) === null) return
    }
    if (!date) return void ignorees.push({ ligne, raison: `date illisible « ${dateBrute} »` })
    const poids = lirePoids(poidsBrut)
    if (poids === null) {
      return void ignorees.push({ ligne, raison: `poids illisible « ${poidsBrut} »` })
    }
    if (poids <= POIDS_MIN || poids > POIDS_MAX) {
      return void ignorees.push({ ligne, raison: `poids hors bornes (${poidsBrut})` })
    }
    const note = noteBrute.slice(0, NOTE_MAX) || undefined
    if (parDate.has(date)) doublons.add(date)
    parDate.set(date, note ? { date, poids, note } : { date, poids })
  })

  return {
    pesees: [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    ignorees,
    doublons: [...doublons].sort(),
  }
}

export interface PlanImport {
  /** Dates absentes de l'historique. */
  nouvelles: PeseeInput[]
  /** Dates déjà présentes avec un autre poids ou une autre note. */
  differentes: { import: PeseeInput; existante: Pesee }[]
  /** Dates déjà présentes à l'identique (rien à faire). */
  identiques: number
}

/** Compare les pesées lues à l'historique, sans rien écrire. */
export function planifierImport(lues: PeseeInput[], existantes: Pesee[]): PlanImport {
  const parDate = new Map(existantes.map((p) => [p.date, p]))
  const plan: PlanImport = { nouvelles: [], differentes: [], identiques: 0 }
  for (const pesee of lues) {
    const existante = parDate.get(pesee.date)
    if (!existante) plan.nouvelles.push(pesee)
    else if (existante.poids === pesee.poids && existante.note === pesee.note) plan.identiques++
    else plan.differentes.push({ import: pesee, existante })
  }
  return plan
}
