# Stack technique

Tout ce sur quoi repose Professeur Machimoto, sur une seule page : quoi, pour quoi faire, où dans
le code, et la décision qui l'a fixé (`Dxx`, détaillée dans le 🗂️ Registre de
[`plan-projet.md`](plan-projet.md), dont le « 🧱 Socle technique » résume les choix de départ).

> Versions relevées le **2026-11-23**. La référence reste `package.json` / `package-lock.json`
> (et `android/` pour Gradle). Dependabot propose les mises à jour une fois par mois.

## En un coup d'œil

```
                ┌───────────────────────── Appareil ─────────────────────────┐
  Navigateur    │  React 19 + TypeScript (Vite)       Web Crypto : AES-GCM   │
  ou APK        │  src/features/ → src/core/ → src/adapters/{web,native}     │
  Android       │  APK : Capacitor 8 (WebView) + plugins Firebase natifs     │
                └───────────────┬────────────────────────────────────────────┘
                                │ uniquement du chiffré (sauf la date)
                ┌───────────────▼──────────── Firebase (plan Spark) ─────────┐
                │  Auth (Google, e-mail)   Firestore europe-west1   Hosting  │
                └────────────────────────────────────────────────────────────┘
```

| Couche            | Technologie                                             | Rôle                                                        | Décisions     |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| Interface         | **React 19**, **TypeScript 6**, CSS maison              | Écrans (`src/features/`)                                    |               |
| Build             | **Vite 8**, `vite-plugin-pwa` (Workbox)                 | Bundle découpé, service worker (web uniquement)             | D40, D51, D54 |
| Validation        | **Zod 4**                                               | Schémas des documents et des préférences (`src/core/`)      |               |
| Chiffrement       | **Web Crypto** (AES-GCM 256, PBKDF2-SHA256 600 000 it.) | Poids, notes, profil chiffrés dans l'appareil               | D3, D16, D48  |
| Backend           | **Firebase** plan **Spark** : Auth, Firestore, Hosting  | Comptes, stockage synchronisé, hébergement web              | D2, D18, D53  |
| Web ↔ Firebase    | **Firebase JS SDK 13**                                  | `src/adapters/web/` ; cache IndexedDB chiffré (option)      | D49           |
| Android           | **Capacitor 8** (WebView)                               | Même appli dans un APK (`android/`, `capacitor.config.ts`)  | D1, D62 à D65 |
| Android ↔ Firebase | `@capacitor-firebase/authentication`, `/firestore` 8.6  | `src/adapters/native/` ; SDK Android, cache hors ligne natif | D66, D67      |
| Android, réseau   | `@capacitor/network`                                    | Indicateur en ligne / hors ligne                            |               |
| Tests             | **Vitest 5**, Testing Library, jsdom                    | Unitaires et interface (`npm test`)                         |               |
| Tests Firebase    | Émulateurs Firebase, `@firebase/rules-unit-testing`     | Règles, stockage, hors ligne (`npm run test:emulateurs`)    | D8, D19       |
| Qualité           | ESLint 10 (+ règle d'architecture), Prettier 3          | `npm run verify`                                            |               |
| CI                | **GitHub Actions** (`ci.yml`), Dependabot               | Check `verify` obligatoire sur `main`                       | D14           |
| Distribution      | GitHub Releases + **Obtainium** (jalon 4)               | APK sans Play Store                                         | D5            |

## Application (web et Android)

- **Une seule base de code.** L'APK embarque le même build web dans une WebView (Capacitor).
  Seuls les **adaptateurs** changent : `src/platform.ts` choisit `web/` ou `native/` au démarrage
  (`Capacitor.isNativePlatform()`), et ne charge que ceux de la plateforme.
- **Architecture** (règle vérifiée par ESLint) :

  | Dossier         | Contenu                                                                        |
  | --------------- | ------------------------------------------------------------------------------ |
  | `src/core/`     | Logique pure : chiffrement, coffre, pesées, analyse ; les 5 interfaces          |
  | `src/features/` | Écrans React ; n'importent que `core/` et les contextes                        |
  | `src/adapters/` | `web/` (Firebase JS SDK, localStorage), `native/` (Capacitor), `memory/` (tests) |

  Les 5 interfaces : `AuthService`, `KeyStore`, `DataStore`, `PreferencesStore`, `FileExporter`.

- **Ce qui diffère entre web et Android** :

  | Sujet              | Web                                           | Android                                                   |
  | ------------------ | --------------------------------------------- | --------------------------------------------------------- |
  | Auth               | SDK JS, Google par fenêtre                    | SDK Android, Google par le sélecteur de compte            |
  | Données hors ligne | IndexedDB (option, D49), service worker (D54) | Cache Firestore natif, toujours actif ; pas de service worker (D64) |
  | Clé de données     | En mémoire (D13)                              | En mémoire pour l'instant ; Keystore + empreinte à trancher (#82) |
  | Export de fichier  | Téléchargement                                | Partage natif à venir (D27)                               |

## Android

| Élément                 | Version / valeur                                           |
| ----------------------- | ---------------------------------------------------------- |
| Identifiant             | `io.github.azaameth.machimoto` (définitif)                 |
| SDK                     | `minSdk` 24, `compileSdk` / `targetSdk` 36 (Android 16)    |
| Gradle / plugin Android | Gradle 8.14.3, Android Gradle Plugin 8.13                  |
| Java                    | JDK 21                                                     |
| Outils                  | SDK en ligne de commande, sans Android Studio (D62)        |
| Émulateurs              | Pixel 7 Pro (Android 17), « moderne » (Android 17 QPR2, pages 16 Ko), Canary |

- **APK de debug** : projet Firebase **fictif** (`demo-suivi-poids`) côté web (D63) et natif
  (D65), émulateurs Firebase joints par `adb reverse`, HTTP en clair vers `localhost` seulement.
  `npm run android` refuse tout APK de debug configuré pour la production.
- **APK de release** (jalon 4) : vrai `google-services.json` (ignoré par Git, injecté par la CI),
  signature par une clé gardée dans les secrets GitHub.

## Services externes

| Service           | Usage                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Firebase `machimoto` | Auth (Google, e-mail), Firestore `europe-west1`, Hosting (`machimoto.web.app`) |
| Google Cloud      | Clés d'API restreintes (web : domaines ; Android : package + SHA-1)    |
| GitHub            | Dépôt public, Actions, Dependabot, secret scanning, Releases           |

Réglages détaillés : [CONTRIBUTING.md § 8](../CONTRIBUTING.md#8-configuration-des-services-externes).

## Outillage de développement

| Outil                    | Rôle                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| Node 24 LTS              | Build, tests, CLI Firebase (`firebase-tools`, dépendance du projet)          |
| Java 21                  | Émulateurs Firebase, Gradle                                                  |
| `scripts/`               | Anti-secrets, exports inutilisés, `android.mjs`, `plan.mjs`, suggestions     |
| `.githooks/pre-commit`   | Refuse un commit contenant un secret                                         |
| Claude Code (`.claude/`) | Hooks de sécurité, skills (PR, fin de bloc, captures web et Android…), voir [CLAUDE.md](../CLAUDE.md) |

## Dépendances (2026-11-23)

<details>
<summary>Production</summary>

| Paquet                               | Version |
| ------------------------------------ | ------- |
| `react`, `react-dom`                 | 19.3.1  |
| `firebase`                           | 13.1.0  |
| `zod`                                | 4.6.7   |
| `@capacitor/core`, `@capacitor/android` | 8.6.0 |
| `@capacitor-firebase/authentication`, `/firestore` | 8.6.0 (peer firebase forcé sur 13, D66) |
| `@capacitor/network`                 | 8.0.1   |

</details>

<details>
<summary>Développement</summary>

| Paquet                                          | Version  |
| ----------------------------------------------- | -------- |
| `vite`, `@vitejs/plugin-react`                  | 8.3.5, 6.1.2 |
| `vite-plugin-pwa`, `workbox-window`             | 2.0.0, 7.4.1 |
| `typescript`                                    | 6.0.3    |
| `vitest`, `@testing-library/react`, `jsdom`     | 5.0.5, 16.3.3, 30.1.3 |
| `eslint`, `typescript-eslint`                   | 10.13.0, 8.72.1 |
| `prettier`                                      | 3.9.10   |
| `firebase-tools`, `@firebase/rules-unit-testing`, `firebase-admin` | 15.34.2, 6.0.0, 14.5.1 |
| `@capacitor/cli`                                | 8.6.0    |

</details>
