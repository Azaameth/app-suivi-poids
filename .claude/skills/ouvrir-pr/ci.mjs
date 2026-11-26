#!/usr/bin/env node
// Attend la fin de la CI d'une PR et donne le verdict (remplace `gh pr checks --watch`, qui passe
// par GraphQL ; ici REST, qui marche dans tous les environnements).
//   node .claude/skills/ouvrir-pr/ci.mjs <n° de PR> [--une-fois]
// Code de sortie : 0 tout vert, 1 au moins un échec, 2 encore en cours (--une-fois).
import { execSync } from 'node:child_process'
import { setTimeout as attendre } from 'node:timers/promises'
import { REPO } from '../../hooks/garde-fous.mjs'

const [numero] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const uneFois = process.argv.includes('--une-fois')
if (!/^\d+$/.test(numero ?? '')) {
  console.error('Usage : node .claude/skills/ouvrir-pr/ci.mjs <n° de PR> [--une-fois]')
  process.exit(2)
}
const api = (chemin) => JSON.parse(execSync(`gh api "${chemin}"`, { encoding: 'utf8' }))
const ECHECS = ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure']

for (let tour = 0; ; tour++) {
  const sha = api(`repos/${REPO}/pulls/${numero}`).head.sha
  const { check_runs: runs } = api(`repos/${REPO}/commits/${sha}/check-runs?per_page=100`)
  const enCours = runs.filter((r) => r.status !== 'completed')
  if (runs.length && !enCours.length) {
    for (const r of runs)
      console.log(
        `${ECHECS.includes(r.conclusion) ? '✗' : '✓'} ${r.name} : ${r.conclusion} — ${r.html_url}`,
      )
    const echecs = runs.filter((r) => ECHECS.includes(r.conclusion))
    if (echecs.length) {
      const run = echecs[0].html_url.match(/runs\/(\d+)/)?.[1]
      if (run) console.log(`\nLogs de l'échec : gh run view ${run} --log-failed`)
      process.exit(1)
    }
    process.exit(0)
  }
  if (uneFois) {
    console.log(
      runs.length ? `en cours : ${enCours.map((r) => r.name).join(', ')}` : 'aucun check encore',
    )
    process.exit(2)
  }
  if (tour === 0) console.log(`CI de #${numero} (${sha.slice(0, 7)}) : attente…`)
  await attendre(10_000)
}
