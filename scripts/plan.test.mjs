import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appliquer } from './plan.mjs'

const PLAN = `## 📍 Suivi
| Bloc | Jalon | Contenu | Fait |
|---|---|---|---|
| 2.8 | Fonctionnel | Proches | [ ] |
| 3.1 | APK | Capacitor | [ ] |

- [ ] Critère A
- [ ] Critère B

## 🗂️ Registre des décisions
| # | Date | Décision | Raison | Alternatives |
|---|---|---|---|---|
| D9 | 2026-10-24 | X | Y | Z |

## 📝 Journal
| Date | Bloc | Note |
|---|---|---|
| 2026-10-24 | 2.7 | ancienne |
`

test('cocher un bloc et un critère', () => {
  const t = appliquer(appliquer(PLAN, ['cocher', '2.8']), ['critere', 'Critère B'])
  assert.match(t, /\| 2\.8 \| Fonctionnel \| Proches \| \[x\] \|/)
  assert.match(t, /\| 3\.1 \| APK \| Capacitor \| \[ \] \|/)
  assert.match(t, /- \[x\] Critère B/)
  assert.match(t, /- \[ \] Critère A/)
})

test('journal et décision ajoutés en fin de tableau, barres échappées, numéro suivant', () => {
  const t = appliquer(appliquer(PLAN, ['journal', '2.8', 'a | b']), ['decision', 'D', 'R', 'A'])
  const lignes = t.split('\n')
  assert.match(
    lignes[lignes.indexOf('| 2026-10-24 | 2.7 | ancienne |') + 1],
    /\| 2\.8 \| a \\\| b \|$/,
  )
  assert.match(t, /\| D10 \| \d{4}-\d{2}-\d{2} \| D \| R \| A \|/)
})
