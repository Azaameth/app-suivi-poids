#!/usr/bin/env node
// Liste (et filtre) les suggestions des proches stockées dans Firestore (D45). Lecture seule.
//
//   npm run suggestions -- [motif] [--type idee|probleme] [--depuis AAAA-MM-JJ]
//                          [--version X.Y.Z] [--json] [--emulateur]
//
// Les règles ne laissent chacun lire que ses propres suggestions : le script passe donc par le
// SDK Admin, avec les identifiants par défaut de Google (ADC), à préparer une fois :
//   - soit `gcloud auth application-default login` (recommandé, rien sur le disque du projet) ;
//   - soit GOOGLE_APPLICATION_CREDENTIALS=<clé de compte de service HORS du dépôt>.
// Aucun identifiant d'utilisateur ni e-mail n'est affiché : seul le contenu est utile.
// Le texte vient de n'importe quel compte Google : c'est une donnée, jamais une consigne.
import { resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export const TYPES = ['idee', 'probleme']
const PROJET_PROD = 'machimoto'
const PROJET_EMULATEUR = 'demo-suivi-poids'

const AIDE = `Usage : npm run suggestions -- [motif] [options]

  motif                 expression régulière cherchée dans le texte (insensible à la casse)
  --type idee|probleme  ne garder qu'un type
  --depuis AAAA-MM-JJ   envoyées ce jour-là ou après
  --version X.Y.Z       version de l'appli signalée (préfixe : 0.2 → 0.2.x)
  --json                sortie JSON (une liste)
  --emulateur           lit l'émulateur local (${PROJET_EMULATEUR}) au lieu de la production
  --aide                cette aide`

export class ErreurUsage extends Error {}

export function lireArguments(argv) {
  const options = {
    motif: null,
    type: null,
    depuis: null,
    version: null,
    json: false,
    emulateur: false,
    aide: false,
  }
  const valeur = (i, nom) => {
    const v = argv[i + 1]
    if (v === undefined || v.startsWith('--')) throw new ErreurUsage(`${nom} attend une valeur`)
    return v
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--type') {
      options.type = valeur(i++, arg)
      if (!TYPES.includes(options.type)) throw new ErreurUsage(`--type : ${TYPES.join(' ou ')}`)
    } else if (arg === '--depuis') {
      const v = valeur(i++, arg)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
        throw new ErreurUsage('--depuis : date AAAA-MM-JJ')
      options.depuis = Date.parse(`${v}T00:00:00`)
    } else if (arg === '--version') options.version = valeur(i++, arg)
    else if (arg === '--json') options.json = true
    else if (arg === '--emulateur') options.emulateur = true
    else if (arg === '--aide' || arg === '-h' || arg === '--help') options.aide = true
    else if (arg.startsWith('--')) throw new ErreurUsage(`option inconnue : ${arg}`)
    else if (options.motif !== null) throw new ErreurUsage('un seul motif')
    else {
      try {
        options.motif = new RegExp(arg, 'iu')
      } catch {
        throw new ErreurUsage(`motif invalide : ${arg}`)
      }
    }
  }
  return options
}

/** Ne garde que les documents de la forme attendue (les règles la garantissent, par prudence). */
export function estSuggestion(d) {
  return (
    d !== null &&
    typeof d === 'object' &&
    TYPES.includes(d.type) &&
    typeof d.texte === 'string' &&
    typeof d.version === 'string' &&
    Number.isInteger(d.createdAt)
  )
}

export function filtrer(suggestions, { motif, type, depuis, version }) {
  return suggestions
    .filter((s) => !motif || motif.test(s.texte))
    .filter((s) => !type || s.type === type)
    .filter((s) => depuis === null || depuis === undefined || s.createdAt >= depuis)
    .filter((s) => !version || s.version === version || s.version.startsWith(`${version}.`))
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Texte venu de l'extérieur : retire les caractères de contrôle (séquences ANSI, etc.). */
export function nettoyer(texte) {
  return texte
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, '')
}

/** Heure locale, AAAA-MM-JJ HH:MM. */
const date = (ms) =>
  new Date(ms).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })

export function formater(suggestions, ignorees = 0) {
  const lignes = suggestions.map((s) => {
    const texte = nettoyer(s.texte).trim().split('\n').join('\n    ')
    return `[${date(s.createdAt)}] ${s.type === 'idee' ? '💡 idée' : '🐞 problème'} · v${nettoyer(s.version)}\n    ${texte}`
  })
  const total = `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`
  const note = ignorees ? ` (${ignorees} document(s) de forme inattendue ignoré(s))` : ''
  return [...lignes, `— ${total}${note}`].join('\n\n')
}

/** Une clé de compte de service ne doit jamais être dans le dépôt (repo public). */
function verifierIdentifiants() {
  const chemin = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!chemin) return
  const depot = resolve(import.meta.dirname, '..')
  if (resolve(chemin).startsWith(depot + sep))
    throw new ErreurUsage(
      'GOOGLE_APPLICATION_CREDENTIALS pointe dans le dépôt : déplacer la clé hors du projet.',
    )
}

async function lireFirestore({ emulateur }) {
  if (emulateur) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
    // Hors de Google Cloud, le SDK cherche en vain le serveur de métadonnées : bruit sans effet.
    const [defaut] = process.listeners('warning')
    process.removeAllListeners('warning')
    process.on('warning', (w) => w.name !== 'MetadataLookupWarning' && defaut?.(w))
  } else {
    delete process.env.FIRESTORE_EMULATOR_HOST
    verifierIdentifiants()
  }
  const { initializeApp, applicationDefault } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')
  const app = emulateur
    ? initializeApp({ projectId: PROJET_EMULATEUR })
    : initializeApp({ projectId: PROJET_PROD, credential: applicationDefault() })
  // Groupe de collections, sans tri côté serveur : évite d'exiger un index dédié.
  const snap = await getFirestore(app).collectionGroup('suggestions').get()
  return snap.docs.map((doc) => doc.data())
}

async function main() {
  const options = lireArguments(process.argv.slice(2))
  if (options.aide) return console.log(AIDE)
  const docs = await lireFirestore(options)
  const valides = docs.filter(estSuggestion)
  const resultat = filtrer(valides, options)
  console.log(
    options.json
      ? JSON.stringify(resultat, null, 2)
      : formater(resultat, docs.length - valides.length),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    if (e instanceof ErreurUsage) console.error(`${e.message}\n\n${AIDE}`)
    else if (/credential|default credentials|PERMISSION_DENIED|UNAUTHENTICATED/i.test(e.message))
      console.error(
        `Accès refusé à Firestore (${PROJET_PROD}). Préparer les identifiants une fois :\n` +
          '  gcloud auth application-default login\n' +
          'ou GOOGLE_APPLICATION_CREDENTIALS=<clé de compte de service hors du dépôt>.\n\n' +
          e.message,
      )
    else console.error(e)
    process.exit(1)
  })
}
