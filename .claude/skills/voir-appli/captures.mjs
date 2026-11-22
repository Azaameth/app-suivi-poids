#!/usr/bin/env node
// Captures de l'appli en dev (émulateurs), pour vérifier un rendu sans écrire de script.
//
//   node .claude/skills/voir-appli/captures.mjs [options] <écran>...
//   node .claude/skills/voir-appli/captures.mjs --installer     (une fois par poste)
//
// Écrans : accueil, tableau, historique, reglages, coffre, saisie,
//          objectif-perdre, objectif-gagner, objectif-maintenir,
//          exploration (fenêtre remontée dans le temps), curseur (appui long sur le graphique),
//          axe (coche « Axe depuis 0 » / « jusqu'au palier IMC » ; après objectif-… pour le palier)
//          (+ « tableau@1an », « tableau@7j »… pour choisir la période)
// Options : --format mobile|bureau|les-deux (mobile = Pixel 7 Pro, 412 px)
//           --theme clair|sombre   --donnees an|baisse|aucune (défaut : an)
//           --pleine-page          --sortie <dossier> (défaut : .claude/etat/captures)
//
// Prérequis : `env-dev.mjs start`. Playwright vit hors du projet (~/.cache), pas de dépendance.
// Sortie : chemins des PNG, puis les erreurs de la page et de la console (toujours lues : un
// `permission-denied` silencieux s'y voit tout de suite).
import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const RACINE = resolve(import.meta.dirname, '../../..')
const CACHE = join(homedir(), '.cache/claude-machimoto/playwright')
const VERSION_PLAYWRIGHT = '1.56.1'
const URL_APPLI = 'http://localhost:5173/'

const args = process.argv.slice(2)
const option = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`)
  return i >= 0 ? args[i + 1] : defaut
}

if (args.includes('--installer')) {
  mkdirSync(CACHE, { recursive: true })
  execSync(`npm --prefix "${CACHE}" install playwright@${VERSION_PLAYWRIGHT}`, { stdio: 'inherit' })
  execSync(`"${CACHE}/node_modules/.bin/playwright" install chromium`, { stdio: 'inherit' })
  process.exit(0)
}

let chromium
try {
  ;({ chromium } = createRequire(join(CACHE, 'package.json'))('playwright'))
} catch {
  console.error(
    `Playwright absent : node ${import.meta.filename} --installer (≈ 110 Mo, une fois).`,
  )
  process.exit(1)
}

const ecrans = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!ecrans.length) {
  console.error('Aucun écran demandé (ex. : tableau reglages coffre). Voir l’en-tête du script.')
  process.exit(1)
}
const formats =
  option('format', 'mobile') === 'les-deux' ? ['mobile', 'bureau'] : [option('format', 'mobile')]
const theme = option('theme', 'clair')
const donnees = option('donnees', 'an')
const sortie = resolve(RACINE, option('sortie', '.claude/etat/captures'))
const pleinePage = args.includes('--pleine-page')
rmSync(sortie, { recursive: true, force: true })
mkdirSync(sortie, { recursive: true })

const VUES = {
  mobile: {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  bureau: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 },
}
const PERIODES = { '7j': '7 j', '30j': '30 j', '90j': '90 j', '1an': '1 an', tout: 'Tout' }
const PHRASE = 'cheval agrafe batterie'
const erreurs = new Set()

async function parcours(navigateur, format) {
  const page = await navigateur.newPage({
    ...VUES[format],
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  })
  page.setDefaultTimeout(10000)
  page.on('pageerror', (e) => erreurs.add(`page : ${e.message}`))
  page.on(
    'console',
    (m) => m.type() === 'error' && erreurs.add(`console : ${m.text().slice(0, 300)}`),
  )
  const capture = async (nom) => {
    await page.waitForTimeout(400) // animations, toasts
    const fichier = join(sortie, `${format}-${theme}-${nom}.png`)
    await page.screenshot({ path: fichier, fullPage: pleinePage })
    console.log(fichier)
  }
  const onglet = (nom) => page.getByRole('button', { name: nom, exact: true }).first().click()
  const champ = (cadre, nom) => cadre.getByLabel(nom, { exact: true })

  await page.goto(URL_APPLI)
  if (theme === 'sombre')
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'sombre'))
  await page.getByRole('button', { name: 'Utiliser un e-mail' }).waitFor()
  if (ecrans.includes('accueil')) await capture('accueil')

  // Compte neuf à chaque fois : l'émulateur ne garde rien d'une capture à l'autre.
  await page.getByRole('button', { name: 'Utiliser un e-mail' }).click()
  await page.getByRole('button', { name: 'Créer un compte' }).click()
  await champ(page, 'E-mail').fill(`capture-${Date.now()}-${format}@exemple.fr`)
  await champ(page, 'Mot de passe').fill('motdepasse-fictif')
  await champ(page, 'Confirmation').fill('motdepasse-fictif')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await page.getByRole('heading', { name: 'Choisis ta phrase secrète' }).waitFor({ timeout: 15000 })
  await champ(page, 'Phrase secrète').fill(PHRASE)
  await champ(page, 'Confirmation').fill(PHRASE)
  await page.getByRole('button', { name: 'Créer mon coffre' }).click()
  await page.getByRole('heading', { name: 'Ton code de secours' }).waitFor({ timeout: 15000 })
  await page.getByLabel('J’ai rangé mon code en lieu sûr').check()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 15000 })

  if (donnees !== 'aucune') {
    await onglet('Réglages')
    const bouton =
      donnees === 'baisse'
        ? 'Scénario : baisse régulière (90 j)'
        : 'Générer un an de données fictives'
    await page.getByRole('button', { name: bouton }).click()
    await page.waitForTimeout(2500)
    await onglet('Tableau de bord')
  }

  async function objectif(usage, cible) {
    await onglet('Réglages')
    const carte = page.getByRole('region', { name: '🎯 Objectif' })
    await carte.waitFor({ timeout: 8000 }).catch(() => {
      throw new Error(
        'carte « 🎯 Objectif » absente des Réglages (bloc 6.1 pas sur cette branche ?)',
      )
    })
    await carte.getByRole('button', { name: usage, exact: true }).click()
    await carte.getByLabel(/Poids (visé|à maintenir)/).fill(cible)
    await carte.getByLabel(/Taille/).fill('178')
    await carte.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByText('Objectif enregistré').last().waitFor()
    await onglet('Tableau de bord')
  }

  for (const ecran of ecrans) {
    const [nom, periode] = ecran.split('@')
    if (nom === 'accueil' || nom === 'coffre') continue
    if (nom === 'tableau') await onglet('Tableau de bord')
    else if (nom === 'historique') await onglet('Historique')
    else if (nom === 'reglages') await onglet('Réglages')
    else if (nom === 'saisie')
      await onglet('Tableau de bord').then(() =>
        page.getByRole('button', { name: 'Saisir la pesée du jour' }).click(),
      )
    else if (nom === 'objectif-perdre') await objectif('Perdre', '72')
    else if (nom === 'objectif-gagner') await objectif('Gagner', '80')
    else if (nom === 'objectif-maintenir') await objectif('Maintenir', '76')
    else if (nom === 'axe') {
      await onglet('Tableau de bord')
      await page.getByLabel(/^Axe /).check()
    } else if (nom === 'exploration') {
      await onglet('Tableau de bord')
      const graphique = page.getByRole('img', { name: /Tendance du/ })
      // La période d'abord : la choisir remet la fenêtre sur aujourd'hui.
      if (periode)
        await page.getByRole('button', { name: PERIODES[periode] ?? periode, exact: true }).click()
      await graphique.focus()
      for (let i = 0; i < 3; i++) await graphique.press('ArrowLeft')
    } else if (nom === 'curseur') {
      await onglet('Tableau de bord')
      const graphique = page.getByRole('img', { name: /Tendance du/ })
      const boite = await graphique.boundingBox()
      const evt = { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 }
      const point = { clientX: boite.x + boite.width * 0.4, clientY: boite.y + boite.height / 2 }
      await graphique.dispatchEvent('pointerdown', { ...evt, ...point })
      await page.waitForTimeout(700) // appui long
      await capture(ecran.replace('@', '-'))
      await graphique.dispatchEvent('pointerup', { ...evt, ...point })
      continue
    } else {
      console.error(`Écran inconnu : ${nom}`)
      continue
    }
    if (periode && nom !== 'exploration')
      await page.getByRole('button', { name: PERIODES[periode] ?? periode, exact: true }).click()
    await capture(ecran.replace('@', '-'))
    if (nom === 'saisie') await page.keyboard.press('Escape')
  }

  if (ecrans.includes('coffre')) {
    await page.getByRole('button', { name: /^Profil/ }).click()
    await page.getByRole('button', { name: '🔒 Verrouiller' }).click()
    await page.getByRole('heading', { name: 'Coffre verrouillé' }).waitFor()
    await capture('coffre')
  }
  await page.close()
}

const navigateur = await chromium.launch()
try {
  for (const format of formats) await parcours(navigateur, format)
} catch (e) {
  console.error(`Échec du parcours : ${e.message.split('\n')[0]}`)
  process.exitCode = 1
} finally {
  await navigateur.close()
  if (erreurs.size)
    console.log(`\nErreurs de la page (${erreurs.size}) :\n${[...erreurs].join('\n')}`)
  else console.log('\nAucune erreur de page ni de console.')
}
