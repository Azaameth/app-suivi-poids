#!/usr/bin/env node
// APK de dev (bloc 3.1) : build web en mode development, garde-fou « jamais la production »,
// cap sync, Gradle, puis installation et lancement sur l'appareil branché (émulateur ou Pixel).
// Prérequis : `npm run emulators` (Firebase) et un appareil visible dans `adb devices`.
//   npm run android            tout
//   npm run android -- --apk   s'arrête à l'APK (android/app/build/outputs/apk/debug/)
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = fileURLToPath(new URL('..', import.meta.url))
const SDK = process.env.ANDROID_HOME ?? join(homedir(), 'Android/Sdk')
const ADB = join(SDK, 'platform-tools/adb')
const APK = join(RACINE, 'android/app/build/outputs/apk/debug/app-debug.apk')
const APP_ID = 'io.github.azaameth.machimoto'
/** Ports des émulateurs Firebase, rendus accessibles à l'appareil via `adb reverse`. */
const PORTS = [9099, 8080]
/** Marque de la config de production : un APK de dev ne doit jamais la contenir (D8). */
const MARQUE_PROD = 'machimoto.firebaseapp.com'

const lancer = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { cwd: RACINE, stdio: 'inherit', ...options })
const etape = (texte) => console.log(`\n▶ ${texte}`)

/** Fichiers JS du build qui contiennent la config de production. */
export function fichiersAvecProd(dossier, marque = MARQUE_PROD) {
  return readdirSync(dossier, { recursive: true })
    .filter((f) => String(f).endsWith('.js'))
    .filter((f) => readFileSync(join(dossier, String(f)), 'utf8').includes(marque))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seulementApk = process.argv.includes('--apk')

  etape('Build web (mode development : projet fictif, émulateurs uniquement)')
  lancer('npx', ['vite', 'build', '--config', 'config/vite.config.ts', '--mode', 'development'])

  const fautifs = fichiersAvecProd(join(RACINE, 'dist'))
  if (fautifs.length) {
    console.error(`\n✗ Le build de dev contient la config de production : ${fautifs.join(', ')}`)
    console.error('  Arrêt : un APK de dev ne doit jamais parler à la production (D8).')
    process.exit(1)
  }

  etape('Copie dans le projet Android (cap sync)')
  lancer('npx', ['cap', 'sync', 'android'])

  etape('APK de debug (Gradle)')
  lancer('./gradlew', ['assembleDebug', '--console=plain', '-q'], {
    cwd: join(RACINE, 'android'),
    env: { ...process.env, ANDROID_HOME: SDK },
  })
  console.log(`APK : ${APK}`)
  if (seulementApk) process.exit(0)

  etape('Installation sur l’appareil')
  const appareils = execFileSync(ADB, ['devices'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .filter((l) => l.endsWith('\tdevice'))
  if (appareils.length !== 1) {
    console.error(`✗ ${appareils.length} appareil(s) prêt(s) dans « adb devices » ; il en faut un.`)
    process.exit(1)
  }
  for (const port of PORTS)
    lancer(ADB, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore' })
  lancer(ADB, ['install', '-r', APK])
  lancer(ADB, ['shell', 'am', 'force-stop', APP_ID])
  lancer(ADB, ['shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1'], {
    stdio: 'ignore',
  })
  console.log('\n✓ Appli lancée. Débogage : chrome://inspect dans Chromium.')
}
