#!/usr/bin/env node
// Ménage après la fusion de PR : `main` local à jour, PR empilées rebasculées vers `main`,
// branches fusionnées supprimées (local + GitHub) — jamais une branche dont la PR est ouverte.
// GitHub en REST (`gh api`) plutôt que `gh pr list/edit` (GraphQL) : marche dans tous les
// environnements, même là où GraphQL est refusé.
//   node .claude/skills/ouvrir-pr/apres-merge.mjs [--simuler]
import { execSync } from 'node:child_process'
import { REPO } from '../../hooks/garde-fous.mjs'

const simuler = process.argv.includes('--simuler')
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const agir = (description, cmd) => {
  console.log(`${simuler ? '[simulation] ' : ''}${description}`)
  if (!simuler) sh(cmd)
}
const pulls = (requete) =>
  JSON.parse(sh(`gh api "repos/${REPO}/pulls?${requete}"`) || '[]').map((p) => ({
    number: p.number,
    headRefName: p.head.ref,
    baseRefName: p.base.ref,
    merged: Boolean(p.merged_at),
  }))

sh('git fetch -q --prune origin')
const fusionnees = pulls('state=closed&sort=updated&direction=desc&per_page=30').filter(
  (p) => p.merged,
)
const ouvertes = pulls('state=open&per_page=100')
const branchesOuvertes = new Set(ouvertes.map((p) => p.headRefName))

// PR empilées dont la base a été fusionnée → base = main
for (const pr of ouvertes) {
  if (pr.baseRefName !== 'main' && fusionnees.some((m) => m.headRefName === pr.baseRefName)) {
    agir(
      `PR #${pr.number} : base ${pr.baseRefName} → main`,
      `gh api -X PATCH repos/${REPO}/pulls/${pr.number} -f base=main --silent`,
    )
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
// Une même branche peut porter plusieurs PR fusionnées (PR reprise, ex. #81 puis #86) :
// chaque branche n'est traitée qu'une fois.
for (const { headRefName: branche, number } of fusionnees) {
  if (branche === 'main' || branchesOuvertes.has(branche)) continue
  if (distantes.delete(branche)) {
    try {
      agir(
        `branche distante ${branche} (PR #${number} fusionnée) supprimée`,
        `git push -q origin --delete ${branche}`,
      )
    } catch (erreur) {
      // Déjà supprimée par GitHub (suppression automatique à la fusion) : rien à faire.
      if (!/remote ref does not exist/.test(String(erreur.stderr))) throw erreur
    }
  }
  if (locales.delete(branche) && branche !== courante) {
    agir(`branche locale ${branche} supprimée`, `git branch -D ${branche}`)
  }
}

if (courante === 'main') agir('main mis à jour', 'git pull -q --ff-only')
else console.log(`(branche courante : ${courante} — main local non modifié)`)
