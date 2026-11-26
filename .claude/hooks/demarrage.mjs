#!/usr/bin/env node
// Hook SessionStart de Claude Code : état du poste en quelques lignes, ajoutées au contexte.
// Évite de redécouvrir l'environnement à chaque session (poste, outils, autre session en cours).
// Local et rapide : aucun appel réseau, jamais bloquant.
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { hostname } from 'node:os'
import { connect } from 'node:net'

const sh = (cmd) => {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim()
  } catch {
    return null
  }
}

/** Un port local est-il ouvert ? (300 ms max) */
const ouvert = (port) =>
  new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1', timeout: 300 })
    const fin = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.on('connect', () => fin(true))
    socket.on('error', () => fin(false))
    socket.on('timeout', () => fin(false))
  })

const poste = `${hostname()}${process.env.FLATPAK_ID ? ' (VS Code Flatpak)' : ''}`
const node = `Node ${process.versions.node}${existsSync('node_modules') ? '' : ', node_modules ABSENT (npm ci)'}`
const gh = sh('command -v gh')
  ? sh('gh auth token')
    ? 'gh connecté'
    : 'gh NON connecté (gh auth login, par Azaameth)'
  : 'gh absent'
// « Picked up _JAVA_OPTIONS… » peut précéder la ligne de version (selon les variables Java du poste)
const java = sh('java -version 2>&1')?.match(/version "(\d+)/)?.[1]
const branche = sh('git branch --show-current') || '(HEAD détachée)'
const worktrees = (sh('git worktree list') ?? '').split('\n').filter(Boolean).length
const enCours = existsSync('.git/rebase-merge') || existsSync('.git/MERGE_HEAD')
const [emu, vite] = await Promise.all([ouvert(8080), ouvert(5173)])

const lignes = [
  `Poste : ${poste} · ${node} · ${gh} · Java ${java ?? 'absent'}`,
  `Git : ${branche}${enCours ? ' · REBASE/MERGE EN COURS' : ''}${worktrees > 1 ? ` · ${worktrees} worktrees` : ''}`,
]
if (emu || vite) {
  lignes.push(
    `Déjà lancés : ${[emu && 'émulateurs (8080)', vite && 'Vite (5173)'].filter(Boolean).join(', ')} — ` +
      'peut-être Azaameth ou une autre session : ne pas les arrêter sans demander.',
  )
}
console.log(lignes.join('\n'))
