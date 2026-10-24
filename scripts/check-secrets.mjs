#!/usr/bin/env node
// Refuse tout fichier sensible suivi ou indexé par git (repo public, cf. CLAUDE.md §3).
import { execSync } from 'node:child_process'

const FORBIDDEN = [
  [/(^|\/)google-services\.json$/, 'injecté par la CI'],
  [/(^|\/)GoogleService-Info\.plist$/, 'injecté par la CI'],
  [/\.(jks|keystore|p12|pem)$/, 'GitHub Secrets uniquement'],
  [/(^|\/)keystore\.properties$/, 'GitHub Secrets uniquement'],
  [/(^|\/)service-account[^/]*\.json$/, 'jamais'],
  [/-adminsdk-[^/]*\.json$/, 'jamais'],
  [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, 'jamais (sauf .env.example)'],
]

const git = (args) => execSync(`git ${args}`, { encoding: 'utf8' }).split('\n').filter(Boolean)
const files = new Set([...git('ls-files'), ...git('diff --cached --name-only --diff-filter=ACR')])

const hits = [...files].flatMap((file) =>
  FORBIDDEN.filter(([pattern]) => pattern.test(file)).map(([, why]) => `  ✗ ${file} — ${why}`),
)

if (hits.length) {
  console.error(`Fichiers sensibles suivis par git :\n${hits.join('\n')}`)
  console.error('Retirer avec : git rm --cached <fichier>')
  process.exit(1)
}
console.log(`check-secrets : OK (${files.size} fichiers vérifiés)`)
