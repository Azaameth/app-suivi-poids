import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { SIGNATURE, examiner, mots, sousCommandes } from './garde-fous.mjs'

test('découpage : guillemets, échappements, séparateurs', () => {
  assert.deepEqual(mots(`gh pr comment 3 --body "a b" -F 'c d'`), [
    'gh',
    'pr',
    'comment',
    '3',
    '--body',
    'a b',
    '-F',
    'c d',
  ])
  assert.deepEqual(sousCommandes('git add -A && git commit -m "x; y" | tail -1'), [
    ['git', 'add', '-A'],
    ['git', 'commit', '-m', 'x; y'],
    ['tail', '-1'],
  ])
})

test('signature GitHub : refus si absente, par variable ou par stdin ; accord si signée', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'garde-'))
  const signe = join(dossier, 'signe.md')
  writeFileSync(signe, `${SIGNATURE}\n\nTexte.`)
  assert.match(examiner('gh issue comment 1 --body "sans signature"'), /signature/)
  assert.match(examiner('gh pr comment 1 --body "$H suite"'), /non vérifiable/)
  assert.match(examiner('gh pr create --body-file -'), /pas stdin/)
  assert.equal(examiner(`gh pr create --title t --body-file ${signe}`), null)
  assert.equal(examiner('gh pr edit 3 --base main'), null)
  assert.equal(examiner('gh pr view 3 --json state'), null)
})

test('commandes sans rapport : autorisées', () => {
  assert.equal(examiner('ls -la && npm run verify'), null)
})
