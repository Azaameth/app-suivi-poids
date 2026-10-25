#!/usr/bin/env node
// Résumé de tout ce qu'Azaameth a pu écrire ou décider sur GitHub depuis une date :
// commentaires (issues, PR, lignes de code), revues, cases cochées, issues/PR fermées ou
// fusionnées, messages de commits de merge (sur main) et alertes de sécurité ouvertes.
//   node .claude/skills/lire-retours/retours.mjs [depuis ISO] [--marquer]
// Sans date : depuis le dernier passage marqué (.claude/etat/dernier-retour), sinon 48 h.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { SIGNATURE } from '../../hooks/garde-fous.mjs'

const REPO = 'Azaameth/app-suivi-poids'
const ETAT = '.claude/etat/dernier-retour'
const args = process.argv.slice(2)
const marquer = args.includes('--marquer')
const depuis =
  args.find((a) => !a.startsWith('--')) ??
  (existsSync(ETAT)
    ? readFileSync(ETAT, 'utf8').trim()
    : new Date(Date.now() - 48 * 3600e3).toISOString())

const api = (chemin) => {
  try {
    return JSON.parse(
      execSync(`gh api --paginate "${chemin}"`, { encoding: 'utf8', maxBuffer: 1 << 26 }),
    )
  } catch {
    return []
  }
}
const signe = (texte) => (texte ?? '').startsWith(SIGNATURE)
const extrait = (texte) => (texte ?? '').trim().replace(/\r/g, '')
const sortie = [`# Retours depuis ${depuis}\n`]
const section = (titre, lignes) => {
  sortie.push(`## ${titre}\n`)
  sortie.push(lignes.length ? lignes.join('\n\n') : '_rien_')
  sortie.push('')
}

// 1. Commentaires de conversation (issues et PR), hors messages signés Claude
const commentaires = api(`repos/${REPO}/issues/comments?since=${depuis}&per_page=100`).filter(
  (c) => !signe(c.body),
)
section(
  'Commentaires (issues et PR)',
  commentaires.map(
    (c) =>
      `**#${c.issue_url.split('/').pop()}** · ${c.user.login} · ${c.created_at}\n> ${extrait(c.body).replaceAll('\n', '\n> ')}`,
  ),
)

// 2. Commentaires sur des lignes de code
const lignes = api(`repos/${REPO}/pulls/comments?since=${depuis}&per_page=100`).filter(
  (c) => !signe(c.body),
)
section(
  'Commentaires sur le code',
  lignes.map(
    (c) =>
      `**PR #${c.pull_request_url.split('/').pop()}** · \`${c.path}:${c.line ?? c.original_line}\` · ${c.user.login}\n> ${extrait(c.body)}`,
  ),
)

// 3. PR mises à jour : revues et cases cochées
const prs = api(`repos/${REPO}/pulls?state=all&sort=updated&direction=desc&per_page=30`).filter(
  (p) => p.updated_at >= depuis,
)
const blocsPr = []
for (const p of prs) {
  const revues = api(`repos/${REPO}/pulls/${p.number}/reviews`).filter(
    (r) => r.submitted_at >= depuis && !signe(r.body) && (r.body || r.state !== 'COMMENTED'),
  )
  const coches = (p.body ?? '').split('\n').filter((l) => /^\s*- \[x\]/i.test(l))
  const etat = p.merged_at
    ? `fusionnée ${p.merged_at}`
    : p.state === 'closed'
      ? 'fermée'
      : 'ouverte'
  const details = [
    ...revues.map(
      (r) => `  - revue ${r.state} par ${r.user.login}${r.body ? ` : ${extrait(r.body)}` : ''}`,
    ),
    ...(coches.length
      ? [`  - cases cochées : ${coches.length}`, ...coches.map((c) => `    ${c.trim()}`)]
      : []),
  ]
  blocsPr.push(
    `**PR #${p.number}** ${p.title} — ${etat}${details.length ? `\n${details.join('\n')}` : ''}`,
  )
}
section('PR mises à jour', blocsPr)

// 4. Issues mises à jour (état)
const issues = api(`repos/${REPO}/issues?state=all&since=${depuis}&per_page=100`).filter(
  (i) => !i.pull_request,
)
section(
  'Issues mises à jour',
  issues.map(
    (i) =>
      `**#${i.number}** ${i.title} — ${i.state}${i.closed_at ? ` (fermée ${i.closed_at})` : ''}`,
  ),
)

// 5. Commits sur main avec un corps (ex. réponse écrite dans un message de merge)
execSync('git fetch -q origin main', { stdio: 'ignore' })
const log = execSync(`git log origin/main --since="${depuis}" --format=%h%x1f%an%x1f%s%x1f%b%x1e`, {
  encoding: 'utf8',
})
const commits = log
  .split('\x1e')
  .map((e) => e.trim().split('\x1f'))
  .filter((e) => e.length === 4)
  .map(([h, auteur, sujet, corps]) => [
    h,
    auteur,
    sujet,
    corps.replace(/^Co-Authored-By:.*$/gim, '').trim(),
  ])
  .filter(([, , , corps]) => corps)
section(
  'Messages de commits sur main (avec corps)',
  commits.map(
    ([h, auteur, sujet, corps]) =>
      `**${h}** ${sujet} · ${auteur}\n> ${corps.replaceAll('\n', '\n> ')}`,
  ),
)

// 6. Alertes de sécurité ouvertes
const alertes = api(`repos/${REPO}/secret-scanning/alerts?state=open`)
section(
  'Alertes de sécurité ouvertes',
  alertes.map((a) => `**secret #${a.number}** ${a.secret_type_display_name} — ${a.html_url}`),
)

console.log(sortie.join('\n'))
if (marquer) {
  mkdirSync('.claude/etat', { recursive: true })
  writeFileSync(ETAT, new Date().toISOString())
}
