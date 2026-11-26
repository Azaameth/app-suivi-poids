import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { SIGNATURE, examiner, examinerMcp, mots, sousCommandes } from './garde-fous.mjs'

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

test('signature GitHub en REST (gh api) : champ body vérifié, texte ou fichier', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'garde-'))
  const signe = join(dossier, 'signe.md')
  writeFileSync(signe, `${SIGNATURE}\n\nTexte.`)
  const url = 'repos/Azaameth/app-suivi-poids/issues/1/comments'
  assert.match(examiner(`gh api ${url} -f body="sans signature"`), /signature/)
  assert.match(examiner(`gh api ${url} -F body=@-`), /pas stdin/)
  assert.equal(examiner(`gh api ${url} -F body=@${signe}`), null)
  assert.equal(examiner(`gh api ${url} --field=body=@${signe}`), null)
  // -f est brut : « @fichier » n'est pas lu, le texte ne commence pas par la signature
  assert.match(examiner(`gh api ${url} -f body=@${signe}`), /signature/)
  assert.equal(
    examiner(`gh api -X PATCH repos/Azaameth/app-suivi-poids/pulls/3 -f base=main`),
    null,
  )
  assert.equal(examiner(`gh api ${url}`), null)
})

test('signature GitHub par outil MCP : body signé exigé, appels sans texte libres', () => {
  const pr = { owner: 'Azaameth', repo: 'app-suivi-poids' }
  assert.match(
    examinerMcp('mcp__github__create_pull_request', { ...pr, body: 'sans signature' }),
    /signature/,
  )
  assert.equal(
    examinerMcp('mcp__github__add_issue_comment', { ...pr, body: `${SIGNATURE}\n\nOK` }),
    null,
  )
  assert.equal(examinerMcp('mcp__github__add_issue_comment', { ...pr, reaction: '+1' }), null)
  assert.equal(examinerMcp('mcp__github__update_pull_request', { ...pr, base: 'main' }), null)
  assert.equal(examinerMcp('mcp__autre__outil', { body: 'libre' }), null)
})

test('pkill -f : refusé si le motif se reconnaît lui-même, accepté avec des crochets', () => {
  assert.match(examiner('pkill -f "emulators:start"; sleep 1'), /pkill -f refusé/)
  assert.match(examiner('pkill -fx vite'), /pkill -f refusé/)
  assert.equal(examiner('pkill -f "[e]mulators:start"'), null)
  assert.equal(examiner('pkill node'), null)
})

test('prettier --write : refusé sans --ignore-path, accepté avec ; --check libre', () => {
  assert.match(
    examiner('npx prettier --config config/prettier.json --write docs src'),
    /prettier --write refusé/,
  )
  assert.match(examiner('node_modules/.bin/prettier -w x.md'), /prettier --write refusé/)
  assert.equal(
    examiner(
      'npx prettier --config config/prettier.json --ignore-path config/prettierignore --write docs',
    ),
    null,
  )
  assert.equal(examiner('npx prettier --check .'), null)
  assert.equal(examiner('npm run format'), null)
})

test('commandes sans rapport : autorisées', () => {
  assert.equal(examiner('ls -la && npm run verify'), null)
})
