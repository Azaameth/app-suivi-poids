#!/usr/bin/env node
// Classes CSS de src/index.css qu'aucun composant ne cite. Une classe construite dynamiquement
// (`imc-${rang}`) est reconnue par son préfixe. Repérage par nom : à confirmer avant de retirer.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = fileURLToPath(new URL('../../..', import.meta.url))
const lister = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? lister(join(d, e.name)) : [join(d, e.name)],
  )

const css = readFileSync(join(racine, 'src/index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const code = lister(join(racine, 'src'))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const classes = [...new Set([...css.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]))]
const prefixes = [...code.matchAll(/([a-z][a-z0-9-]*-)\$\{/g)].map((m) => m[1])
const cite = (c) => new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(code)
const inutiles = classes.filter((c) => !cite(c) && !prefixes.some((p) => c.startsWith(p)))

if (inutiles.length) {
  console.log(`Classes CSS citées nulle part (${inutiles.length}) :`)
  for (const c of inutiles) console.log(`  .${c}`)
} else console.log(`css-inutile : OK (${classes.length} classes)`)
