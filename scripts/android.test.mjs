import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { apkDe, fichiersAvecProd, projetCompile, servicesDebug } from './android.mjs'

test('garde-fou : repère la config de production dans un build, sous-dossiers compris', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'build-'))
  mkdirSync(join(dossier, 'assets'))
  writeFileSync(join(dossier, 'assets/index.js'), 'authDomain:"machimoto.firebaseapp.com"')
  writeFileSync(join(dossier, 'assets/demo.js'), 'projectId:"demo-suivi-poids"')
  writeFileSync(join(dossier, 'index.html'), 'machimoto.firebaseapp.com')
  assert.deepEqual(fichiersAvecProd(dossier), [join('assets', 'index.js')])
})

test('build de dev propre : rien à signaler', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'build-'))
  writeFileSync(join(dossier, 'index.js'), 'projectId:"demo-suivi-poids"')
  assert.deepEqual(fichiersAvecProd(dossier), [])
})

test('APK de debug : google-services.json fictif, projet « demo- », bon package', () => {
  const config = servicesDebug('io.github.azaameth.machimoto')
  assert.equal(config.project_info.project_id, 'demo-suivi-poids')
  assert.equal(
    config.client[0].client_info.android_client_info.package_name,
    'io.github.azaameth.machimoto',
  )
  assert.doesNotMatch(JSON.stringify(config), /AIza|machimoto\.firebase/)
})

test('lit le projet compilé dans les ressources générées par Gradle', () => {
  const xml =
    '<string name="google_app_id">1:0:android:0</string><string name="project_id" translatable="false">demo-suivi-poids</string>'
  assert.equal(projetCompile(xml), 'demo-suivi-poids')
  assert.equal(projetCompile('<resources/>'), null)
})

test('APK : le plus récent du dossier, quel que soit son nom (version dans le nom, 4.1)', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'apk-'))
  writeFileSync(join(dossier, 'app-debug.apk'), '')
  utimesSync(join(dossier, 'app-debug.apk'), 1, 1)
  writeFileSync(join(dossier, 'machimoto-0.3.0-debug.apk'), '')
  writeFileSync(join(dossier, 'output-metadata.json'), '{}')
  assert.equal(apkDe(dossier), join(dossier, 'machimoto-0.3.0-debug.apk'))
  assert.throws(() => apkDe(mkdtempSync(join(tmpdir(), 'vide-'))), /Aucun APK/)
})
