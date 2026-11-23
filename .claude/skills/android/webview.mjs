#!/usr/bin/env node
// Pilote l'appli installée sur l'appareil (APK de debug) par le protocole de débogage de Chrome :
// même Playwright que voir-appli, branché sur la WebView via `adb forward`.
//   node .claude/skills/android/webview.mjs connexion        compte e-mail neuf + coffre → tableau de bord
//   node .claude/skills/android/webview.mjs capture <nom>    PNG dans .claude/etat/captures/android-<nom>.png
//   node .claude/skills/android/webview.mjs peser <kg>       saisit ou remplace la pesée du jour
//   node .claude/skills/android/webview.mjs deverrouiller    phrase de test sur « Coffre verrouillé »
//   node .claude/skills/android/webview.mjs etat             texte de l'écran + requêtes en échec
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const RACINE = resolve(import.meta.dirname, '../../..')
const ADB = join(process.env.ANDROID_HOME ?? join(homedir(), 'Android/Sdk'), 'platform-tools/adb')
const PORT = 9222
const PHRASE = 'cheval agrafe batterie'
const [, , commande = 'etat', nom = 'ecran'] = process.argv

const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8' })

// La WebView de l'appli ouvre une socket « webview_devtools_remote_<pid> » (build de debug).
const sockets = [...new Set(adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/g))]
if (!sockets.length) {
  console.error('Aucune WebView débogable : appli lancée ? APK de debug (npm run android) ?')
  process.exit(1)
}
adb('forward', '--remove-all')
adb('forward', `tcp:${PORT}`, `localabstract:${sockets.at(-1)}`)

const { chromium } = createRequire(join(homedir(), '.cache/claude-machimoto/playwright/package.json'))(
  'playwright',
)
const navigateur = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
const page = navigateur.contexts()[0].pages()[0]
const erreurs = []
page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()))

try {
  if (commande === 'connexion') {
    await page.getByRole('button', { name: 'Utiliser un e-mail' }).click()
    await page.getByRole('button', { name: 'Créer un compte' }).click()
    await page.getByRole('textbox', { name: 'E-mail' }).fill(`android-${Date.now()}@exemple.test`)
    await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse-android')
    await page.getByLabel('Confirmation').fill('motdepasse-android')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await page.getByRole('heading', { name: 'Choisis ta phrase secrète' }).waitFor({ timeout: 20_000 })
    await page.getByLabel('Phrase secrète').fill(PHRASE)
    await page.getByLabel('Confirmation').fill(PHRASE)
    await page.getByRole('button', { name: 'Créer mon coffre' }).click()
    await page.getByRole('heading', { name: 'Ton code de secours' }).waitFor({ timeout: 30_000 })
    await page.getByLabel('J’ai rangé mon code en lieu sûr').check()
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 20_000 })
    console.log('✓ compte, coffre et tableau de bord (émulateurs Firebase joints)')
  } else if (commande === 'peser') {
    await page
      .getByRole('button', { name: /Saisir ma première pesée|Saisir la pesée du jour|Modifier/ })
      .first()
      .click()
    const fenetre = page.getByRole('dialog', { name: 'Pesée du jour' })
    await fenetre.getByLabel('Poids (kg)').fill(nom)
    await fenetre.getByRole('button', { name: /Ajouter|Enregistrer/ }).click()
    const remplacer = fenetre.getByRole('button', { name: /Remplacer/ })
    if (await remplacer.isVisible().catch(() => false)) await remplacer.click()
    await page.waitForTimeout(1500)
    const statut = (await page.locator('header').innerText())
      .split('\n')
      .find((l) => /ligne|Synchro/.test(l))
    console.log(`✓ pesée ${nom} kg ; synchro : ${statut}`)
  } else if (commande === 'deverrouiller') {
    await page.getByLabel('Phrase secrète').fill(PHRASE)
    await page.getByRole('button', { name: 'Déverrouiller' }).click()
    await page.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 30_000 })
    console.log('✓ coffre déverrouillé')
  } else if (commande === 'capture') {
    const dossier = join(RACINE, '.claude/etat/captures')
    mkdirSync(dossier, { recursive: true })
    const fichier = join(dossier, `android-${nom}.png`)
    await page.screenshot({ path: fichier })
    console.log(fichier)
  } else {
    console.log(`url : ${page.url()}\n`)
    console.log(await page.locator('body').innerText())
    const echecs = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((e) => e.responseStatus >= 400)
        .map((e) => `${e.responseStatus} ${e.name}`),
    )
    if (echecs.length) console.log(`\nRequêtes en échec :\n${echecs.join('\n')}`)
  }
} finally {
  if (erreurs.length) console.log(`\nErreurs de console :\n${erreurs.join('\n')}`)
  await navigateur.close()
}
