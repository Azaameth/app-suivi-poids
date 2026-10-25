#!/usr/bin/env node
// Ménage après la fusion de PR : `main` local à jour, PR empilées rebasculées vers `main`,
// branches fusionnées supprimées (local + GitHub) — jamais une branche dont la PR est ouverte.
//   node .claude/skills/ouvrir-pr/apres-merge.mjs [--simuler]
import { execSync } from 'node:child_process'

const simuler = process.argv.includes('--simuler')
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const agir = (description, cmd) => {
  console.log(`${simuler ? '[simulation] ' : ''}${description}`)
  if (!simuler) sh(cmd)
}
const json = (cmd) => JSON.parse(sh(cmd) || '[]')

sh('git fetch -q --prune origin')
const fusionnees = json('gh pr list --state merged --limit 30 --json number,headRefName')
const ouvertes = json('gh pr list --state open --json number,headRefName,baseRefName')
const branchesOuvertes = new Set(ouvertes.map((p) => p.headRefName))

// PR empilées dont la base a été fusionnée → base = main
for (const pr of ouvertes) {
  if (pr.baseRefName !== 'main' && fusionnees.some((m) => m.headRefName === pr.baseRefName)) {
    agir(`PR #${pr.number} : base ${pr.baseRefName} → main`, `gh pr edit ${pr.number} --base main`)
  }
}

// Branches fusionnées encore présentes
const distantes = new Set(
  sh("git branch -r --format='%(refname:short)'")
    .split('\n')
    .map((b) => b.replace(/^origin\//, '')),
)
const locales = new Set(sh("git branch --format='%(refname:short)'").split('\n'))
const courante = sh('git branch --show-current')
for (const { headRefName: branche, number } of fusionnees) {
  if (branche === 'main' || branchesOuvertes.has(branche)) continue
  if (distantes.has(branche)) {
    agir(
      `branche distante ${branche} (PR #${number} fusionnée) supprimée`,
      `git push -q origin --delete ${branche}`,
    )
  }
  if (locales.has(branche) && branche !== courante) {
    agir(`branche locale ${branche} supprimée`, `git branch -D ${branche}`)
  }
}

if (courante === 'main') agir('main mis à jour', 'git pull -q --ff-only')
else console.log(`(branche courante : ${courante} — main local non modifié)`)
