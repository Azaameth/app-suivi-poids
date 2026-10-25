#!/usr/bin/env node
// Mises à jour fiables de docs/plan-projet.md (utilisé par le skill fin-de-bloc) :
//   node scripts/plan.mjs cocher <bloc>                          case du 📍 Suivi
//   node scripts/plan.mjs critere "<extrait unique>"             case « - [ ] » d'un critère
//   node scripts/plan.mjs journal <bloc> "<note>"                ligne datée du 📝 Journal
//   node scripts/plan.mjs decision "<décision>" "<raison>" "<alternatives>"   D suivante au Registre
// Chaque commande échoue (code 1) si sa cible est absente ou ambiguë : rien n'est écrit.
import { readFileSync, writeFileSync } from 'node:fs'

const FICHIER = process.env.PLAN_FICHIER ?? 'docs/plan-projet.md'
const aujourdhui = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const cellule = (texte) => texte.replaceAll('|', '\\|').replaceAll('\n', ' ')

function echec(message) {
  console.error(`plan.mjs : ${message}`)
  process.exit(1)
}

/** Index de la dernière ligne de tableau d'une section (titre exact). */
function finDeTableau(lignes, titre) {
  const debut = lignes.findIndex((l) => l.trim() === titre)
  if (debut < 0) echec(`section « ${titre} » introuvable`)
  let fin = -1
  for (let i = debut + 1; i < lignes.length && !/^#{1,2} /.test(lignes[i]); i++) {
    if (lignes[i].startsWith('|')) fin = i
  }
  if (fin < 0) echec(`tableau de « ${titre} » introuvable`)
  return fin
}

export function appliquer(texte, [commande, ...args]) {
  const lignes = texte.split('\n')
  switch (commande) {
    case 'cocher': {
      const [bloc] = args
      const idx = lignes.flatMap((l, i) =>
        l.startsWith(`| ${bloc} |`) && l.trim().endsWith('| [ ] |') ? [i] : [],
      )
      if (idx.length !== 1)
        echec(`bloc « ${bloc} » non coché introuvable (ou ambigu) dans le Suivi`)
      lignes[idx[0]] = lignes[idx[0]].replace(/\| \[ \] \|\s*$/, '| [x] |')
      break
    }
    case 'critere': {
      const [extrait] = args
      const idx = lignes.flatMap((l, i) =>
        l.startsWith('- [ ] ') && l.includes(extrait) ? [i] : [],
      )
      if (idx.length !== 1)
        echec(`critère « ${extrait} » : ${idx.length} correspondance(s), il en faut une`)
      lignes[idx[0]] = lignes[idx[0]].replace('- [ ] ', '- [x] ')
      break
    }
    case 'journal': {
      const [bloc, note] = args
      if (!bloc || !note) echec('usage : journal <bloc> "<note>"')
      const fin = finDeTableau(lignes, '## 📝 Journal')
      lignes.splice(fin + 1, 0, `| ${aujourdhui()} | ${cellule(bloc)} | ${cellule(note)} |`)
      break
    }
    case 'decision': {
      const [decision, raison, alternatives] = args
      if (!decision || !raison || alternatives === undefined) {
        echec('usage : decision "<décision>" "<raison>" "<alternatives>"')
      }
      const numeros = [...texte.matchAll(/^\| D(\d+) \|/gm)].map((m) => Number(m[1]))
      const suivant = Math.max(0, ...numeros) + 1
      const fin = finDeTableau(lignes, '## 🗂️ Registre des décisions')
      lignes.splice(
        fin + 1,
        0,
        `| D${suivant} | ${aujourdhui()} | ${cellule(decision)} | ${cellule(raison)} | ${cellule(alternatives)} |`,
      )
      console.log(`D${suivant}`)
      break
    }
    default:
      echec('commandes : cocher, critere, journal, decision')
  }
  return lignes.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(FICHIER, appliquer(readFileSync(FICHIER, 'utf8'), process.argv.slice(2)))
}
