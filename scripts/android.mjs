#!/usr/bin/env node
// APK de dev (bloc 3.1) : build web en mode development, garde-fou « jamais la production »,
// cap sync, Gradle, puis installation et lancement sur l'appareil branché (émulateur ou Pixel).
// Côté natif aussi (bloc 3.2) : l'APK de debug reçoit un google-services.json fictif
// (android/app/src/debug/, généré, ignoré par Git) ; le vrai ne sert qu'aux APK de release.
// Prérequis : `npm run emulators` (Firebase) et un appareil visible dans `adb devices`.
//   npm run android            tout
//   npm run android -- --apk   s'arrête à l'APK (android/app/build/outputs/apk/debug/)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
/** Projet fictif : les SDK Firebase n'y parlent qu'aux émulateurs (D8). */
const PROJET_DEMO = 'demo-suivi-poids'
const SERVICES_DEBUG = join(RACINE, 'android/app/src/debug/google-services.json')
const VALEURS_DEBUG = join(
  RACINE,
  'android/app/build/generated/res/processDebugGoogleServices/values/values.xml',
)

const lancer = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { cwd: RACINE, stdio: 'inherit', ...options })
const etape = (texte) => console.log(`\n▶ ${texte}`)

/** Fichiers JS du build qui contiennent la config de production. */
export function fichiersAvecProd(dossier, marque = MARQUE_PROD) {
  return readdirSync(dossier, { recursive: true })
    .filter((f) => String(f).endsWith('.js'))
    .filter((f) => readFileSync(join(dossier, String(f)), 'utf8').includes(marque))
}

/** google-services.json fictif de l'APK de debug : projet « demo- », aucune vraie clé. */
export function servicesDebug(appId = APP_ID) {
  return {
    project_info: { project_number: '000000000000', project_id: PROJET_DEMO },
    client: [
      {
        client_info: {
          mobilesdk_app_id: '1:000000000000:android:0000000000000000',
          android_client_info: { package_name: appId },
        },
        api_key: [{ current_key: 'demo-api-key' }],
      },
    ],
    configuration_version: '1',
  }
}

/** Projet Firebase compilé dans l'APK (ressource `project_id` générée par Gradle). */
export function projetCompile(valuesXml) {
  return valuesXml.match(/name="project_id"[^>]*>([^<]*)</)?.[1] ?? null
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

  mkdirSync(join(SERVICES_DEBUG, '..'), { recursive: true })
  writeFileSync(SERVICES_DEBUG, `${JSON.stringify(servicesDebug(), null, 2)}\n`)

  etape('APK de debug (Gradle)')
  lancer('./gradlew', ['assembleDebug', '--console=plain', '-q'], {
    cwd: join(RACINE, 'android'),
    env: { ...process.env, ANDROID_HOME: SDK },
  })
  const projet = projetCompile(readFileSync(VALEURS_DEBUG, 'utf8'))
  if (!projet?.startsWith('demo-')) {
    console.error(`\n✗ L'APK de debug est configuré pour le projet « ${projet} » (natif).`)
    console.error('  Arrêt : un APK de dev ne doit jamais parler à la production (D8).')
    process.exit(1)
  }
  console.log(`APK : ${APK} (projet natif : ${projet})`)
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
