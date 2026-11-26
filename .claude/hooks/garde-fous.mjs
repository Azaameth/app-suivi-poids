#!/usr/bin/env node
// Hook PreToolUse (Bash) de Claude Code : garde-fous issus d'erreurs réelles (voir CLAUDE.md).
//  1. git commit sans `npm run verify` réussi sur cet état du code (+ test:emulateurs si les
//     règles ou les tests sous émulateur changent) ;
//  2. suppression d'une branche dont la PR est encore ouverte ;
//  3. texte posté sur GitHub sans la signature « 🤖 Claude » (gh, gh api REST, outils MCP GitHub) ;
//  4. `pkill -f <motif>` dont le motif se retrouve dans la ligne de commande du shell lancé
//     par Claude : la commande se tue elle-même (vécu au bloc 6.1) ;
//  5. `prettier --write` sans `--ignore-path config/prettierignore` : reformate des fichiers que
//     le projet exclut (vécu deux fois le 2026-11-22 : docs réécrites, tableaux réalignés).
// Appels GitHub en REST (`gh api`) plutôt que `gh pr list` & co (GraphQL) : marche dans tous les
// environnements, même là où GraphQL est refusé.
// Entrée : JSON sur stdin ({ tool_name, tool_input }). Refus : JSON permissionDecision « deny ».
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { empreinte, estDoc } from '../../scripts/empreinte.mjs'

export const SIGNATURE =
  '> 🤖 **Claude** · assistant IA (Claude Code), qui poste via le compte Azaameth'
export const REPO = 'Azaameth/app-suivi-poids'

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/** Découpe une ligne de commande en mots (guillemets simples / doubles, échappements). */
export function mots(ligne) {
  const res = []
  let cur = ''
  let quote = null
  let has = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (quote) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"' && i + 1 < ligne.length) cur += ligne[++i]
      else cur += c
    } else if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (c === '\\' && i + 1 < ligne.length) {
      cur += ligne[++i]
      has = true
    } else if (/\s/.test(c) || ';&|()'.includes(c)) {
      if (cur || has) res.push(cur)
      if (';&|()'.includes(c)) res.push(c)
      cur = ''
      has = false
    } else {
      cur += c
      has = true
    }
  }
  if (cur || has) res.push(cur)
  return res
}

/** Sous-commandes séparées par ; && || | ( ). */
export function sousCommandes(ligne) {
  const groupes = [[]]
  for (const m of mots(ligne)) {
    if (';&|()'.includes(m) && m.length === 1) groupes.push([])
    else groupes.at(-1).push(m)
  }
  return groupes.filter((g) => g.length)
}

function verifierCommit() {
  const fichiers = [
    ...sh('git diff HEAD --name-only').split('\n'),
    ...sh('git ls-files --others --exclude-standard').split('\n'),
  ].filter(Boolean)
  const code = fichiers.filter((f) => !estDoc(f))
  if (!code.length) return null // documentation seule
  const actuelle = empreinte()
  const lire = (nom) =>
    existsSync(`.claude/etat/${nom}`) ? readFileSync(`.claude/etat/${nom}`, 'utf8') : ''
  if (lire('verify') !== actuelle) {
    return 'Commit refusé : `npm run verify` n’a pas réussi sur cet état du code. Lance-le, corrige si besoin, puis committe.'
  }
  const emulateurs = code.some((f) =>
    /^(firebase\/|tests\/emulateurs\/|src\/core\/|src\/adapters\/)/.test(f),
  )
  if (emulateurs && lire('emulateurs') !== actuelle) {
    return 'Commit refusé : règles, cœur ou adaptateurs modifiés ; `npm run test:emulateurs` doit réussir sur cet état du code.'
  }
  return null
}

function branchesSupprimees(args) {
  if (args[0] === 'git' && args[1] === 'branch' && args.some((a) => /^-(d|D|-delete)$/.test(a))) {
    return args.slice(2).filter((a) => !a.startsWith('-'))
  }
  if (args[0] === 'git' && args[1] === 'push') {
    const reste = args.slice(2).filter((a) => !a.startsWith('-') || a === '--delete' || a === '-d')
    if (args.includes('--delete') || args.includes('-d')) {
      return reste.filter((a) => a !== '--delete' && a !== '-d').slice(1) // après le remote
    }
    return reste.filter((a) => a.startsWith(':')).map((a) => a.slice(1))
  }
  return []
}

function verifierBranches(branches) {
  for (const branche of branches) {
    let ouvertes = '0'
    try {
      // REST et non `gh pr list` (GraphQL, pas disponible partout)
      ouvertes = sh(
        `gh api "repos/${REPO}/pulls?state=open&head=${REPO.split('/')[0]}:${branche}" --jq length`,
      )
    } catch {
      return `Suppression refusée : impossible de vérifier la PR de « ${branche} » (gh indisponible).`
    }
    if (ouvertes !== '0') {
      return `Suppression refusée : la PR de « ${branche} » est encore ouverte (supprimer la branche fermerait la PR).`
    }
  }
  return null
}

/** `gh api … -f body=texte` ou `-F body=@fichier` (REST). */
function corpsApi(args) {
  for (let i = 2; i < args.length; i++) {
    const a = args[i]
    const champ = ['-f', '-F', '--field', '--raw-field'].includes(a)
      ? args[i + 1]
      : a.match(/^(?:-[fF]|--(?:raw-)?field=)(body=.*)$/)?.[1]
    if (!champ?.startsWith('body=')) continue
    const valeur = champ.slice(5)
    const brut = a === '-f' || a === '--raw-field' || a.startsWith('--raw-field=') || /^-f./.test(a)
    if (!brut && valeur.startsWith('@')) return { fichier: valeur.slice(1) }
    return { texte: valeur }
  }
  return null
}

function corpsGitHub(args) {
  if (args[0] !== 'gh') return undefined
  if (args[1] === 'api') return corpsApi(args)
  const cible = `${args[1]} ${args[2]}`
  if (!/^(issue|pr) (comment|create|edit|review)$/.test(cible)) return undefined
  for (let i = 3; i < args.length; i++) {
    const a = args[i]
    if (a === '--body' || a === '-b') return { texte: args[i + 1] ?? '' }
    if (a.startsWith('--body=')) return { texte: a.slice(7) }
    if (a === '--body-file' || a === '-F') return { fichier: args[i + 1] }
    if (a.startsWith('--body-file=')) return { fichier: a.slice(12) }
  }
  return null // pas de corps (ex. gh pr edit --base main)
}

function verifierSignature(args) {
  const corps = corpsGitHub(args)
  if (!corps) return null
  let texte = corps.texte
  if (corps.fichier) {
    if (corps.fichier === '-')
      return 'Texte GitHub refusé : utilise --body-file <fichier> (pas stdin) pour que la signature soit vérifiable.'
    try {
      texte = readFileSync(corps.fichier, 'utf8')
    } catch {
      return `Texte GitHub refusé : fichier « ${corps.fichier} » illisible.`
    }
  }
  if (texte.includes('$(') || /\$[A-Za-z_{]/.test(texte.split('\n')[0])) {
    return 'Texte GitHub refusé : signature non vérifiable (variable ou $( )). Écris le texte dans un fichier et passe --body-file.'
  }
  if (!texte.startsWith(SIGNATURE)) {
    return `Texte GitHub refusé : il doit commencer par la signature :\n${SIGNATURE}`
  }
  return null
}

/** `pkill -f motif` : le motif figure aussi dans `bash -c "…pkill -f motif…"`, qui est tué. */
function verifierPkill(args) {
  if (args[0] !== 'pkill' || !args.some((a) => /^-\w*f/.test(a) || a === '--full')) return null
  const motif =
    args
      .slice(1)
      .filter((a) => !a.startsWith('-'))
      .at(-1) ?? ''
  if (/\[[^\]]+\]/.test(motif)) return null // `[f]irebase` ne se reconnaît pas lui-même
  return (
    `pkill -f refusé : le motif « ${motif} » correspond aussi au shell de cette commande, qui ` +
    'serait tué. Écris la 1re lettre entre crochets (« [f]irebase… »), ou pour l’appli : ' +
    'node .claude/skills/voir-appli/env-dev.mjs stop'
  )
}

/** `prettier --write` (ou `-w`) doit passer par la configuration et les exclusions du projet. */
function verifierPrettier(args) {
  const i = args.findIndex((a) => a === 'prettier' || a.endsWith('/prettier'))
  if (i < 0 || !args.slice(i).some((a) => a === '--write' || a === '-w')) return null
  if (args.includes('--ignore-path')) return null
  return (
    'prettier --write refusé sans --ignore-path : il reformaterait des fichiers exclus par le ' +
    'projet. Utiliser `npx prettier --config config/prettier.json --ignore-path ' +
    'config/prettierignore --write <fichiers>` (ou `npm run format`).'
  )
}

/**
 * Outils MCP GitHub : tout texte publié (`body`) doit
 * commencer par la signature, comme avec `gh`. Sans `body` (réaction, changement de base) : libre.
 */
export function examinerMcp(outil, entree = {}) {
  if (!outil.startsWith('mcp__github__')) return null
  const texte = entree.body
  if (typeof texte !== 'string' || !texte) return null
  if (!texte.startsWith(SIGNATURE)) {
    return `Texte GitHub refusé : il doit commencer par la signature :\n${SIGNATURE}`
  }
  return null
}

export function examiner(commande) {
  for (const args of sousCommandes(commande)) {
    if (args[0] === 'git' && args[1] === 'commit') {
      const refus = verifierCommit()
      if (refus) return refus
    }
    const branches = branchesSupprimees(args)
    if (branches.length) {
      const refus = verifierBranches(branches)
      if (refus) return refus
    }
    const refus = verifierSignature(args) ?? verifierPkill(args) ?? verifierPrettier(args)
    if (refus) return refus
  }
  return null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const entree = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const outil = entree.tool_name ?? 'Bash'
  const refus =
    outil === 'Bash'
      ? examiner(entree.tool_input?.command ?? '')
      : examinerMcp(outil, entree.tool_input)
  if (refus) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: refus,
        },
      }),
    )
  }
}
