import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ErreurUsage,
  estSuggestion,
  filtrer,
  formater,
  lireArguments,
  nettoyer,
} from './suggestions.mjs'

const s = (
  texte,
  type = 'idee',
  version = '0.2.1',
  createdAt = Date.parse('2026-11-01T10:00:00Z'),
) => ({
  type,
  texte,
  version,
  createdAt,
})

test('lireArguments : motif et options', () => {
  const o = lireArguments(['graph', '--type', 'probleme', '--depuis', '2026-11-01', '--json'])
  assert.ok(o.motif.test('Le GRAPHIQUE'))
  assert.equal(o.type, 'probleme')
  assert.equal(o.depuis, Date.parse('2026-11-01T00:00:00'))
  assert.equal(o.json, true)
  assert.equal(o.emulateur, false)
})

test('lireArguments : erreurs', () => {
  assert.throws(() => lireArguments(['--type', 'bug']), ErreurUsage)
  assert.throws(() => lireArguments(['--depuis', '01/11/2026']), ErreurUsage)
  assert.throws(() => lireArguments(['--version']), ErreurUsage)
  assert.throws(() => lireArguments(['--inconnue']), ErreurUsage)
  assert.throws(() => lireArguments(['(']), ErreurUsage)
  assert.throws(() => lireArguments(['a', 'b']), ErreurUsage)
})

test('estSuggestion : forme attendue seulement', () => {
  assert.ok(estSuggestion(s('Un texte assez long')))
  assert.ok(!estSuggestion({ ...s('Un texte assez long'), type: 'autre' }))
  assert.ok(!estSuggestion({ texte: 'x' }))
  assert.ok(!estSuggestion(null))
})

test('filtrer : motif, type, date, version (préfixe) et tri chronologique', () => {
  const liste = [
    s('Courbe trop petite', 'probleme', '0.3.0', 3),
    s('Ajouter un mode sombre', 'idee', '0.2.1', 1),
    s('La courbe clignote', 'probleme', '0.2.10', 2),
  ]
  assert.deepEqual(
    filtrer(liste, { motif: /courbe/i }).map((x) => x.createdAt),
    [2, 3],
  )
  assert.equal(filtrer(liste, { type: 'idee' }).length, 1)
  assert.equal(filtrer(liste, { depuis: 2 }).length, 2)
  assert.deepEqual(
    filtrer(liste, { version: '0.2' }).map((x) => x.version),
    ['0.2.1', '0.2.10'],
  )
  assert.equal(filtrer(liste, { version: '0.2.1' }).length, 1)
})

test('nettoyer : retire les séquences de contrôle', () => {
  assert.equal(nettoyer('a\u001b[31mb\r\nc‮d'), 'a[31mb\ncd')
})

test('formater : sans identifiant, avec total', () => {
  const sortie = formater([s('Ligne 1\nLigne 2')], 1)
  assert.match(sortie, /💡 idée · v0\.2\.1\n {4}Ligne 1\n {4}Ligne 2/)
  assert.match(sortie, /1 suggestion \(1 document/)
})
