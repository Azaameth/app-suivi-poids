import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fichiersAvecProd } from './android.mjs'

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
