---
name: android
description: Faire tourner l'APK de dev de Professeur Machimoto dans un émulateur Android (ou sur le Pixel branché), le piloter et le capturer — démarrage d'un appareil virtuel sans fenêtre, npm run android, pilotage de la WebView par Playwright, logs. À utiliser pour tout travail du jalon 3 (Capacitor, adaptateurs natifs) ou quand Azaameth signale un défaut sur Android.
---

# Android (jalon 3)

SDK en ligne de commande dans `~/Android/Sdk` (D62). Les commandes ci-dessous donnent les chemins
complets : `environment.d` n'est vu par les shells de Claude qu'après une nouvelle session KDE.

## 1. Démarrer

1. Émulateurs Firebase : `node .claude/skills/voir-appli/env-dev.mjs start --frais`.
2. Appareil virtuel, en arrière-plan (`run_in_background`), **un seul à la fois** :
   `exec ~/Android/Sdk/emulator/emulator -avd <nom> -no-window -no-audio -no-boot-anim -no-snapshot-save -gpu swiftshader_indirect > <scratchpad>/emulateur.log 2>&1`

   | Nom                   | Usage                                                             |
   | --------------------- | ----------------------------------------------------------------- |
   | `machimoto-pixel7pro` | par défaut : au plus près du téléphone d'Azaameth (Android 17)    |
   | `machimoto-moderne`   | avant chaque PR du jalon 3 : Android 17 QPR2, **pages de 16 Ko**  |
   | `machimoto-canary`    | ponctuellement : prochaine version d'Android, instable            |

3. Attendre le démarrage (17 à 30 s) :
   `A=~/Android/Sdk/platform-tools/adb; timeout 300 $A wait-for-device && until [ "$($A shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 3; done`

## 2. Installer et lancer

`npm run android` : build web en mode **development**, garde-fou (refuse un build contenant la
config de production), `cap sync`, Gradle, `adb reverse` des ports Firebase (9099, 8080),
installation, lancement. `-- --apk` s'arrête à l'APK.

> ⚠️ Né d'une erreur réelle (bloc 3.1) : `vite build --mode development` gardait
> `import.meta.env.PROD` à `true`, et l'APK de dev visait la production (requête refusée par la
> restriction de la clé d'API). La config dépend désormais de `MODE` ; ne jamais construire un APK
> de dev autrement que par `npm run android`.

## 3. Piloter et regarder

- `node .claude/skills/android/webview.mjs connexion` : compte e-mail neuf, coffre, tableau de bord.
- `node .claude/skills/android/webview.mjs peser <kg>` / `deverrouiller` : pesée du jour, phrase de test.
- `node .claude/skills/android/webview.mjs capture <nom>` : PNG de la WebView dans `.claude/etat/captures/`.
- `node .claude/skills/android/webview.mjs etat` : texte de l'écran, requêtes en échec, erreurs de console.
- Écran entier (barres Android, dialogues système) : `adb exec-out screencap -p > <scratchpad>/x.png`.
- Logs : `adb logcat -d | grep -iE "machimoto|chromium|capacitor|FATAL"`. Les plantages en boucle de
  `android.hardware.uwb-service` (pas de puce UWB dans l'émulateur) sont un bruit sans rapport.
- Playwright absent : `node .claude/skills/voir-appli/captures.mjs --installer`.

## 4. Arrêter

`adb emu kill`, puis `node .claude/skills/voir-appli/env-dev.mjs stop`.

## Pièges connus

- **Simuler le hors ligne** : le mode avion (`adb shell cmd connectivity airplane-mode enable`)
  coupe le réseau vu par l'appli (indicateur « Hors ligne »), mais **pas** `adb reverse`, qui
  passe par le canal de débogage. Pour que Firestore ne joigne vraiment plus l'émulateur :
  `adb reverse --remove tcp:8080`, puis **redémarrer l'appli** (une connexion déjà ouverte survit
  au retrait du tunnel). Retour : `adb reverse tcp:8080 tcp:8080`, mode avion désactivé.
- **Recharger la WebView ne redémarre pas le SDK natif** : il garde l'émulateur branché et son
  cache ouvert. Le vidage du cache à la déconnexion se fait au démarrage à froid suivant (D67).

- Connexion Google : impossible dans l'émulateur sans compte Google ; utiliser l'e-mail (D53).
- Android 17 : permission « accès au réseau local ». `adb reverse` passe par `localhost` et n'est
  pas concerné ; joindre une machine du réseau (Wi-Fi) le serait.
- Pas de service worker sur Android (`platform.ts`) : les fichiers viennent de l'APK.
- `google-services.json` (D65) : le vrai (projet `machimoto`, fourni par Maxime) dans
  `android/app/`, pour la release ; l'APK de debug utilise un fichier fictif `demo-suivi-poids`
  que `npm run android` régénère dans `android/app/src/debug/`. Les deux sont ignorés par Git.
