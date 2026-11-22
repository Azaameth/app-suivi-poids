#!/usr/bin/env node
// Environnement de dev pour Claude : émulateurs Auth + Firestore et serveur Vite, en arrière-plan.
//
//   node .claude/skills/voir-appli/env-dev.mjs start [--frais]   démarre (--frais : relance tout)
//   node .claude/skills/voir-appli/env-dev.mjs status
//   node .claude/skills/voir-appli/env-dev.mjs stop
//
// - Ne touche pas aux données d'Azaameth : pas d'import/export de `.emulator-data/`.
// - Les émulateurs relisent les règles au démarrage ; après un changement de branche, `--frais`
//   évite de tester contre d'anciennes règles (piège rencontré au bloc 6.1).
// - Arrêt par groupe de processus (PID enregistrés) : jamais de `pkill -f`, qui peut tuer le shell.
// - Si les ports sont déjà pris par un autre processus (les émulateurs d'Azaameth), on le dit et
//   on ne touche à rien.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RACINE = resolve(import.meta.dirname, '../../..')
const ETAT = join(RACINE, '.claude/etat/env-dev')
const PIDS = join(ETAT, 'pids.json')
export const PORTS = { firestore: 8080, auth: 9099, vite: 5173 }
export const URL_APPLI = `http://localhost:${PORTS.vite}/`

/** Le port répond-il ? Vite écoute sur `::1`, les émulateurs sur `127.0.0.1` : on essaie les deux. */
const repond = async (port) => {
  for (const hote of ['127.0.0.1', '[::1]']) {
    try {
      await fetch(`http://${hote}:${port}/`, { signal: AbortSignal.timeout(1000) })
      return true
    } catch {
      /* hôte suivant */
    }
  }
  return false
}

const lirePids = () => (existsSync(PIDS) ? JSON.parse(readFileSync(PIDS, 'utf8')) : null)
const vivant = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function etat() {
  const ports = Object.fromEntries(
    await Promise.all(Object.entries(PORTS).map(async ([nom, p]) => [nom, await repond(p)])),
  )
  const pids = lirePids()
  const nos = pids && Object.values(pids).some(vivant)
  return { ports, nos: Boolean(nos), pids }
}

function lancer(nom, commande, args) {
  const log = openSync(join(ETAT, `${nom}.log`), 'w')
  const enfant = spawn(commande, args, {
    cwd: RACINE,
    detached: true, // propre groupe de processus : arrêt de tout l'arbre (Java compris)
    stdio: ['ignore', log, log],
    env: { ...process.env, npm_config_loglevel: 'error' },
  })
  enfant.unref()
  return enfant.pid
}

async function attendre(ports, secondes = 90) {
  for (let i = 0; i < secondes; i++) {
    if ((await Promise.all(ports.map(repond))).every(Boolean)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function stop() {
  const pids = lirePids()
  if (!pids) return console.log('env-dev : rien à arrêter (aucun processus lancé par Claude).')
  for (const pid of Object.values(pids)) {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      /* déjà arrêté */
    }
  }
  for (let i = 0; i < 15 && Object.values(pids).some(vivant); i++) {
    await new Promise((r) => setTimeout(r, 500))
  }
  for (const pid of Object.values(pids).filter(vivant)) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      /* déjà arrêté */
    }
  }
  rmSync(PIDS, { force: true })
  console.log('env-dev : arrêté.')
}

async function start(frais) {
  mkdirSync(ETAT, { recursive: true })
  if (frais) await stop()
  const { ports, nos } = await etat()
  const occupes = Object.entries(ports).filter(([, ok]) => ok)
  if (occupes.length === 3) {
    console.log(
      `env-dev : déjà prêt${nos ? '' : ' (processus d’Azaameth : règles peut-être anciennes)'} → ${URL_APPLI}`,
    )
    return
  }
  if (occupes.length && !nos) {
    console.error(
      `env-dev : ports occupés par un autre processus (${occupes.map(([n]) => n).join(', ')}). ` +
        'Demander à Azaameth d’arrêter ses émulateurs / son serveur, ou les utiliser tels quels.',
    )
    process.exit(1)
  }
  const pids = lirePids() ?? {}
  if (!ports.firestore || !ports.auth) {
    pids.emulateurs = lancer('emulateurs', 'npx', [
      'firebase',
      'emulators:start',
      '--only',
      'auth,firestore',
      '--project',
      'demo-suivi-poids',
    ])
  }
  if (!ports.vite) {
    pids.vite = lancer('vite', 'npx', [
      'vite',
      '--config',
      'config/vite.config.ts',
      '--port',
      String(PORTS.vite),
      '--strictPort',
    ])
  }
  writeFileSync(PIDS, JSON.stringify(pids))
  if (await attendre(Object.values(PORTS))) console.log(`env-dev : prêt → ${URL_APPLI}`)
  else {
    console.error(`env-dev : pas prêt après 90 s ; journaux dans ${ETAT}/*.log`)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [action = 'status', option] = process.argv.slice(2)
  if (action === 'start') await start(option === '--frais')
  else if (action === 'stop') await stop()
  else {
    const { ports, nos } = await etat()
    const liste = Object.entries(ports).map(([n, ok]) => `${n} ${ok ? '✓' : '✗'}`)
    console.log(`env-dev : ${liste.join(', ')}${nos ? ' (lancés par Claude)' : ''}`)
  }
}
