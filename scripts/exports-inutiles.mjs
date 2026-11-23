#!/usr/bin/env node
// Signale les exports de valeurs (fonction, constante, classe) de src/ qu'aucun autre fichier
// n'utilise, tests compris : du code mort, ou une portée trop large (#62, avant le jalon 3).
// Les types ne sont pas contrôlés : exporter le type d'une signature publique est normal.
// Repérage par nom (mot entier), donc approximatif dans le sens prudent : un nom présent
// ailleurs, même dans un autre sens, n'est pas signalé.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DECLARATION =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/gm

/** Noms exportés par `source` (valeurs seulement). */
export function exportsDeValeurs(source) {
  return [...source.matchAll(DECLARATION)].map((m) => m[1])
}

/**
 * `fichiers` : Map chemin → contenu. Rend les `{ fichier, nom }` dont le nom n'apparaît dans
 * aucun autre fichier.
 */
export function exportsInutiles(fichiers) {
  const resultats = []
  for (const [fichier, source] of fichiers) {
    for (const nom of exportsDeValeurs(source)) {
      const mot = new RegExp(`(?<![\\w$])${nom.replace(/\$/g, '\\$')}(?![\\w$])`)
      const utilise = [...fichiers].some(([autre, texte]) => autre !== fichier && mot.test(texte))
      if (!utilise) resultats.push({ fichier, nom })
    }
  }
  return resultats
}

function lister(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? lister(join(dossier, e.name)) : [join(dossier, e.name)],
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const racine = fileURLToPath(new URL('..', import.meta.url))
  const fichiers = new Map(
    ['src', 'tests']
      .flatMap((d) => lister(join(racine, d)))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => [relative(racine, f), readFileSync(f, 'utf8')]),
  )
  const inutiles = exportsInutiles(fichiers)
  if (inutiles.length) {
    console.error('Exports utilisés nulle part ailleurs (retirer `export`, ou le code) :')
    for (const { fichier, nom } of inutiles) console.error(`  ✗ ${fichier} : ${nom}`)
    process.exit(1)
  }
  console.log(`exports-inutiles : OK (${fichiers.size} fichiers)`)
}
