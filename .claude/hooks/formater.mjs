#!/usr/bin/env node
// Hook PostToolUse (Edit|Write) de Claude Code : Prettier sur le fichier modifié, avec la
// configuration du projet. Fichiers ignorés ou non pris en charge : rien. Jamais bloquant.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative } from 'node:path'

const entree = JSON.parse(readFileSync(0, 'utf8') || '{}')
const fichier = entree.tool_input?.file_path ?? entree.tool_response?.filePath
const racine = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
if (fichier) {
  const chemin = relative(racine, fichier)
  if (!chemin.startsWith('..')) {
    try {
      execFileSync(
        `${racine}/node_modules/.bin/prettier`,
        [
          '--config',
          'config/prettier.json',
          '--ignore-path',
          'config/prettierignore',
          '--ignore-unknown',
          '--log-level',
          'warn',
          '--write',
          chemin,
        ],
        { cwd: racine, stdio: 'ignore' },
      )
    } catch {
      // erreur de syntaxe en cours d'édition : la vérification la signalera
    }
  }
}
