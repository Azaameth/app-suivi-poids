#!/usr/bin/env node
// Empreinte du contenu du code (fichiers suivis et non suivis, hors docs), indépendante des commits.
// `node scripts/empreinte.mjs marquer <nom>` : enregistre l'empreinte après une vérification réussie.
// `node scripts/empreinte.mjs` : affiche l'empreinte courante.
// Utilisé par le garde-fou de commit de Claude Code (.claude/hooks/garde-fous.mjs).
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Fichiers sans effet sur la vérification : documentation. */
export const estDoc = (fichier) => fichier.startsWith('docs/') || fichier.endsWith('.md')

/**
 * Empreinte = arbre Git du contenu actuel des fichiers (suivis ou non, hors ignorés et hors
 * documentation), calculé dans un index temporaire : indépendante des commits, donc stable si
 * l'on committe en plusieurs fois un état déjà vérifié.
 */
export function empreinte() {
  const dossier = mkdtempSync(join(tmpdir(), 'empreinte-'))
  const env = { ...process.env, GIT_INDEX_FILE: join(dossier, 'index') }
  const gitIdx = (args) =>
    execSync(`git ${args}`, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] })
  try {
    gitIdx('add -A')
    gitIdx("rm -r -q --cached --ignore-unmatch -- docs '*.md'")
    return gitIdx('write-tree').trim()
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [action, nom] = process.argv.slice(2)
  if (action === 'marquer' && nom) {
    mkdirSync('.claude/etat', { recursive: true })
    writeFileSync(`.claude/etat/${nom}`, empreinte())
    console.log(`empreinte « ${nom} » enregistrée`)
  } else {
    console.log(empreinte())
  }
}
