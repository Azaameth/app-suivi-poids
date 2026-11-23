import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exportsDeValeurs, exportsInutiles } from './exports-inutiles.mjs'

test('repère fonctions, constantes et classes, pas les types', () => {
  const source = `
export function a() {}
export async function b() {}
export const C = 1
export class D {}
export type E = string
export interface F {}
const g = 2
`
  assert.deepEqual(exportsDeValeurs(source), ['a', 'b', 'C', 'D'])
})

test('signale un export utilisé seulement dans son propre fichier', () => {
  const fichiers = new Map([
    ['src/a.ts', 'export const UTILE = 1\nexport const SEUL = 2\nconst x = SEUL'],
    ['src/b.ts', "import { UTILE } from './a'"],
  ])
  assert.deepEqual(exportsInutiles(fichiers), [{ fichier: 'src/a.ts', nom: 'SEUL' }])
})

test('un usage dans un test suffit ; mot entier seulement', () => {
  const fichiers = new Map([
    ['src/a.ts', 'export function cle() {}\nexport function lire() {}'],
    ['src/a.test.ts', 'cle(); relire()'],
  ])
  assert.deepEqual(exportsInutiles(fichiers), [{ fichier: 'src/a.ts', nom: 'lire' }])
})
