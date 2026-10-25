#!/usr/bin/env node
// Vérifie la production après un `npm run deploy` d'Azaameth (lecture seule) :
//  1. le site sert le build de origin/main (noms des fichiers versionnés identiques) ;
//  2. en-têtes de sécurité et de cache sur / ; chemins réservés /__/auth/* non touchés ;
//  3. manifeste web et icônes servis ;
//  4. clé d'API restreinte (refus sans référent, acceptée depuis le site).
//   node .claude/skills/verifier-prod/verifier.mjs
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SITE = 'https://machimoto.web.app'
const AUTH = 'https://machimoto.firebaseapp.com'
let echecs = 0
const ok = (cond, texte) => {
  console.log(`${cond ? '✅' : '❌'} ${texte}`)
  if (!cond) echecs++
}
const entetes = async (url) => {
  const r = await fetch(url, { method: 'HEAD', redirect: 'manual' })
  return { statut: r.status, h: (n) => r.headers.get(n) }
}

// 1. Build de origin/main comparé au site
const dossier = mkdtempSync(join(tmpdir(), 'verif-prod-'))
try {
  execSync('git fetch -q origin main', { stdio: 'ignore' })
  execSync(`git worktree add -q --detach "${dossier}/src" origin/main`, { stdio: 'ignore' })
  execSync(`ln -s "${process.cwd()}/node_modules" "${dossier}/src/node_modules"`)
  execSync(
    `npx vite build --config config/vite.config.ts --outDir "${dossier}/dist" --logLevel error`,
    {
      cwd: `${dossier}/src`,
      stdio: 'ignore',
    },
  )
  const attendus = readdirSync(`${dossier}/dist/assets`).sort()
  const html = await (await fetch(`${SITE}/`)).text()
  const servis = [...html.matchAll(/assets\/([^"]+)/g)].map((m) => m[1])
  const principaux = attendus.filter((f) => /^index-.*\.(js|css)$/.test(f))
  ok(
    principaux.every((f) => servis.includes(f)),
    `le site sert le build de origin/main (${principaux.join(', ')})`,
  )
  const version = JSON.parse(readFileSync(`${dossier}/src/package.json`, 'utf8')).version
  console.log(`   version de origin/main : ${version}`)
} catch (e) {
  ok(false, `build de origin/main impossible : ${e.message.split('\n')[0]}`)
} finally {
  execSync(`git worktree remove --force "${dossier}/src"`, { stdio: 'ignore' })
  rmSync(dossier, { recursive: true, force: true })
}

// 2. En-têtes
const racine = await entetes(`${SITE}/`)
ok(racine.h('x-content-type-options') === 'nosniff', 'nosniff sur /')
ok(racine.h('x-frame-options') === 'DENY', 'X-Frame-Options: DENY sur /')
ok(!!racine.h('referrer-policy'), `Referrer-Policy sur / (${racine.h('referrer-policy')})`)
ok(!!racine.h('permissions-policy'), 'Permissions-Policy sur /')
ok(
  !!(racine.h('content-security-policy') ?? racine.h('content-security-policy-report-only')),
  'Content-Security-Policy (ou Report-Only) sur /',
)
ok(racine.h('cache-control') === 'no-cache', 'index.html revalidé (no-cache)')
for (const chemin of ['/__/auth/iframe', '/__/auth/handler']) {
  const r = await entetes(`${AUTH}${chemin}`)
  ok(
    r.statut === 200 && !r.h('x-frame-options'),
    `${chemin} servi sans X-Frame-Options (connexion Google intacte)`,
  )
}

// 3. Manifeste et icônes
// Toute URL inconnue renvoie index.html (réécriture SPA) : on vérifie le type, pas le statut.
const manifeste = await fetch(`${SITE}/manifest.webmanifest`)
const icones = manifeste.headers.get('content-type')?.includes('html')
  ? null
  : ((await manifeste.json().catch(() => ({}))).icons ?? null)
ok(!!icones, 'manifest.webmanifest servi (JSON, pas la page d’accueil)')
for (const icone of icones ?? []) {
  const r = await entetes(`${SITE}/${icone.src}`)
  ok(r.h('content-type') === 'image/png', `icône ${icone.src} (${icone.sizes}, ${icone.purpose})`)
}

// 4. Clé d'API restreinte
const config = readFileSync('src/firebase.config.ts', 'utf8').match(/apiKey: '([^']+)'/)?.[1]
const essai = (referent) =>
  fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(referent && { Referer: referent }) },
    body: '{"idToken":"x"}',
  }).then((r) => r.json())
const sans = await essai()
ok(
  sans.error?.details?.[0]?.reason === 'API_KEY_HTTP_REFERRER_BLOCKED',
  'clé d’API refusée sans référent',
)
const avec = await essai(`${SITE}/`)
ok(avec.error?.message === 'INVALID_ID_TOKEN', 'clé d’API acceptée depuis le site')

console.log(echecs ? `\n${echecs} point(s) à corriger.` : '\nProduction conforme.')
process.exit(echecs ? 1 : 0)
