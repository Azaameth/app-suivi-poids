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

const DATE_ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/
const DATE_FR = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/
/** Heure facultative après la date, avec un fuseau (`Z`, `+02:00`) éventuel. */
const HEURE = /^(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i

function jourValide(a: string, m: string, j: string): string | null {
  const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`
  const d = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date ? date : null
}

/**
 * `2026-10-25`, `2026/10/25` ou `25/10/2026` (aussi `25-10-2026`, `25.10.2026`), suivie ou non
 * d'une heure → `2026-10-25`. Avec un fuseau (`2026-10-24T22:30:00Z`), c'est le jour **local**
 * de cet instant qui compte, comme pour une saisie (D16).
 */
export function lireDate(valeur: string): string | null {
  const iso = DATE_ISO.exec(valeur)
  const fr = iso ? null : DATE_FR.exec(valeur)
  const debut = iso ?? fr
  if (!debut) return null
  const reste = HEURE.exec(valeur.slice(debut[0].length))
  if (!reste) return null
  const jour = iso ? jourValide(iso[1], iso[2], iso[3]) : jourValide(fr![3], fr![2], fr![1])
  if (!jour || !reste[1]) return jour
  const instant = new Date(valeur.replace(' ', 'T'))
  if (Number.isNaN(instant.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
}

/** `137,7`, `137.7`, `137,7 kg` → 137.7 ; null si illisible. */
function lirePoids(valeur: string): number | null {
  const nettoye = valeur.replace(/\s*kg$/i, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(nettoye)) return null
  return Number(nettoye)
}

/** En-tête en minuscules, sans accents. */
const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Colonnes voisines du poids à ne jamais prendre pour lui (balances connectées, autres applis). */
const AUTRE_MESURE =
  /tendance|trend|grasse|fat|muscle|eau|water|hydrat|bmi|imc|osseuse|bone|cible|objectif|goal|maigre|lean|viscer|proteine|protein|metabol|bmr|age|taille|height/

interface Colonnes {
  date: number
  poids: number
  note: number | null
}

/** Reconnaît les colonnes par leur nom ; null si l'en-tête ne nomme pas date et poids. */
function colonnesParEnTete(enTete: string[]): Colonnes | null {
  const noms = enTete.map(normaliser)
  const trouver = (motif: RegExp) =>
    noms.findIndex((nom) => motif.test(nom) && !AUTRE_MESURE.test(nom))
  const exacte = noms.indexOf('date')
  const date = exacte >= 0 ? exacte : trouver(/date|jour|day|horodat|timestamp|time|mesure/)
  const poids = trouver(/poids|weight|masse|^kg$|\(kg\)/)
  const note = trouver(/note|comment|remarque|memo/)
  if (date < 0 || poids < 0 || date === poids) return null
  return { date, poids, note: note >= 0 && note !== date && note !== poids ? note : null }
}

/** Sans en-tête exploitable : colonne de date, puis première colonne qui se lit comme un poids. */
function colonnesParContenu(valeurs: string[]): Colonnes | null {
  const date = valeurs.findIndex((v) => lireDate(v) !== null)
  if (date < 0) return null
  if (date === 0) return { date: 0, poids: 1, note: 2 } // ordre historique : date, poids, note
  const poids = valeurs.findIndex((v, i) => i !== date && lirePoids(v) !== null)
  return poids < 0 ? null : { date, poids, note: null }
}

/** Séparateur le plus présent dans la ligne, hors guillemets (`;` > tabulation > `,` à égalité). */
function detecterSeparateur(ligne: string): string {
  const horsGuillemets = ligne.replace(/"(?:[^"]|"")*"/g, '')
  const compte = (c: string) => horsGuillemets.split(c).length - 1
  const candidats = [';', '\t', ','].filter((c) => compte(c) > 0)
  return candidats.sort((a, b) => compte(b) - compte(a))[0] ?? ','
}

/**
 * Lit un CSV de pesées. Les colonnes sont reconnues par leur **nom** quand il y a un en-tête
 * (`Date`, `Poids (kg)`, `weight`, `Note`… dans n'importe quel ordre ; les autres mesures
 * comme la masse grasse ou la tendance sont écartées), sinon par leur **contenu** (date, puis
 * poids). Séparateur `;`, tabulation ou `,` détecté ; lignes de commentaire `#` ignorées ;
 * l'export de l'appli (D28) se relit tel quel. Rien n'est bloquant : les lignes illisibles
 * sont listées dans `ignorees`.
 */
export function lireCsv(texte: string): LectureCsv {
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/)
  const contenu = (l: string) => l.trim() !== '' && !l.trimStart().startsWith('#')
  const premiere = lignes.find(contenu) ?? ''
  const separateur = detecterSeparateur(premiere)
  // Notre export (D28) protège déjà ses champs : pas de virgule décimale à deviner.
  const exportAppli = premiere.trim() === 'date,poids_kg,note'
  // Ligne entière entre guillemets (tableur qui a tout mis dans la colonne A) : on la déballe.
  const lire = (brute: string) => {
    const valeurs = champs(brute, separateur)
    if (valeurs.length !== 1 || !/^\s*"/.test(brute)) return valeurs
    const interne = detecterSeparateur(valeurs[0])
    return valeurs[0].includes(interne) ? champs(valeurs[0], interne) : valeurs
  }
  const parDate = new Map<string, PeseeInput>()
  const doublons = new Set<string>()
  const ignorees: LigneIgnoree[] = []
  let colonnes: Colonnes | null = null
  let parEnTete = false
  let premiereLue = false

  lignes.forEach((brute, index) => {
    if (!contenu(brute)) return
    const ligne = index + 1
    const valeurs = lire(brute)
    if (!premiereLue) {
      premiereLue = true
      // En-tête : aucune date, et des noms de colonnes reconnus ou aucun poids lisible.
      const parNoms = colonnesParEnTete(valeurs)
      const sansDate = !valeurs.some((v) => lireDate(v) !== null)
      if (sansDate && (parNoms || !valeurs.some((v) => lirePoids(v) !== null))) {
        colonnes = parNoms
        parEnTete = parNoms !== null
        return
      }
    }
    // `2026-10-25,137,7` : virgule décimale non protégée, pas une note « 7 ».
    if (
      separateur === ',' &&
      !exportAppli &&
      !parEnTete &&
      valeurs.length === 3 &&
      /^\d+$/.test(valeurs[1]) &&
      /^\d+$/.test(valeurs[2])
    ) {
      valeurs.splice(1, 2, `${valeurs[1]}.${valeurs[2]}`)
    }
    colonnes ??= colonnesParContenu(valeurs)
    const { date: iDate = 0, poids: iPoids = 1, note: iNote = null } = colonnes ?? {}
    const dateBrute = valeurs[iDate] ?? ''
    const poidsBrut = valeurs[iPoids] ?? ''
    const noteBrute = iNote === null ? '' : (valeurs[iNote] ?? '')
    const date = lireDate(dateBrute)
    if (!date) return void ignorees.push({ ligne, raison: `date illisible « ${dateBrute} »` })
    const poids = lirePoids(poidsBrut)
    if (poids === null) {
      const raison = lireDate(poidsBrut)
        ? `poids illisible « ${poidsBrut} » (un tableur l'a sans doute converti en date)`
        : `poids illisible « ${poidsBrut} »`
      return void ignorees.push({ ligne, raison })
    }
    if (poids <= POIDS_MIN || poids > POIDS_MAX) {
      return void ignorees.push({ ligne, raison: `poids hors bornes (${poidsBrut})` })
    }
    // Apostrophe ajoutée par l'export devant une note qui ressemble à une formule.
    const sansProtection = /^'[=+\-@\t\r]/.test(noteBrute) ? noteBrute.slice(1) : noteBrute
    const note = sansProtection.slice(0, NOTE_MAX) || undefined
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
