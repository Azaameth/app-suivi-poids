# CLAUDE.md — Reprise du projet « Appli perso (web + Android) »

> Fichier de passation pour Claude Code. À placer à la **racine du repo**.
> Les deux documents de pilotage doivent être copiés dans `docs/` :
> - `docs/plan-projet.md` → **source de vérité** du projet (blocs, critères, décisions)
> - `docs/plan-installation-outils.md` → environnement de dev
>
> En cas de contradiction entre ce fichier et `docs/plan-projet.md`, **le plan projet gagne**.

---

## 1. Qui, quoi

- **Utilisateur :** Maxime, développeur data/BI (SQL, Snowflake, Power BI, PHP, PowerShell). À l'aise en code, **moins familier du dev front/mobile** (React, PWA, Android, Capacitor) : expliquer brièvement les notions nouvelles, sans noyer.
- **Langue :** français. Réponses concises et directes.
- **Façon de travailler :** itérative, sur du code réel. Montrer les fichiers, faire exécuter les vérifications, attendre le résultat avant d'enchaîner.
- **Téléphone de test :** Google Pixel 7 Pro.

**Projet :** appli perso distribuée en APK (pas de Play Store), avec une version web. Besoin clé : données **chiffrées**, synchronisées avec Firebase, utilisables **hors ligne** avec resynchro automatique.

**Ordre retenu :** site web fonctionnel d'abord → puis APK. Ne pas sauter de jalon.

---

## 2. Stack (décidée — ne pas remettre en cause sans le proposer explicitement)

| Domaine | Choix |
|---|---|
| Front | Vite + React + TypeScript |
| Backend | Firebase **plan Spark** (Auth + Firestore), région UE (`europe-west1`) |
| Chiffrement | Web Crypto API, AES-GCM 256 sur les champs sensibles ; clé de données encapsulée par une clé dérivée d'une phrase secrète (PBKDF2-SHA256) |
| Architecture | 3 interfaces : `AuthService`, `KeyStore`, `DataStore` ; adaptateurs `web/` puis `native/` |
| Cache | Web : mémoire uniquement. Android : cache natif Firestore |
| Mobile (jalon 3) | Capacitor + `@capacitor-firebase/authentication`, `@capacitor-firebase/firestore`, `@aparajita/capacitor-secure-storage` (Android Keystore), `@capacitor/network` |
| Hébergement web | Firebase Hosting |
| CI/CD | GitHub Actions, repo **public** |
| Distribution | GitHub Releases + Obtainium |

**Écarté :** Flutter, Supabase (pause après 7 j d'inactivité), Kotlin natif, SQLite chiffré + synchro maison.

---

## 3. Règles non négociables

### Règle d'or d'architecture
Les composants React (`src/features/`) n'importent **que** `src/core/` ou des contextes React.
Jamais `firebase/*`, `@capacitor/*`, `localStorage`, `indexedDB` en dehors de `src/adapters/`.

### Sécurité (repo public)
| Élément | Commit ? |
|---|---|
| Config Firebase client (`apiKey`, `projectId`…) | ✅ oui |
| `firestore.rules`, `firestore.indexes.json` | ✅ oui |
| `google-services.json` | ❌ non (injecté par la CI) |
| `*.jks`, `*.keystore`, mots de passe | ❌ jamais (GitHub Secrets) |
| `service-account*.json`, `.env*` (sauf `.env.example`) | ❌ jamais |
| Données réelles | ❌ non, données fictives uniquement |

**Avant chaque commit :** `git status` + vérifier qu'aucun fichier ci-dessus n'est suivi.

### Chiffrement
- IV aléatoire de 12 octets à **chaque** chiffrement ; format versionné `v1:<iv_b64>:<data_b64>`.
- Nombre d'itérations PBKDF2 élevé et **documenté** dans le code (≥ 600 000, recommandation OWASP pour SHA-256).
- Aucun filtre / tri / index Firestore sur un champ chiffré.
- Sur le web : clé et phrase secrète **en mémoire uniquement** (jamais `localStorage` / IndexedDB).
- Méta-données de clé : `users/{uid}/meta/keys` → `{ wrappedKey, salt, iterations, version }`.

### Firebase
- Refus par défaut ; accès uniquement à `users/{uid}/**` si `request.auth.uid == uid`.
- Toujours développer contre les **émulateurs** ; la prod n'est touchée qu'au bloc 1.7.
- Rester en Spark. Attention aux boucles de lectures (préférer `onSnapshot` à des relectures).

### Conventions
- Branches : `feat/<bloc>-<sujet>` (ex. `feat/1.4-crypto`) → PR vers `main` (protégée).
- Commits : Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`).
- Tags `vX.Y.Z` ; `versionCode` Android = `X*10000 + Y*100 + Z`.
- Ne **jamais** remplir un `<À DÉFINIR>` soi-même : poser la question.

---

## 4. Où on en est

- Environnement : Arch + VS Code Flatpak, opérationnel (§9, D9).
- **Jalon 1 terminé** (blocs 1.1 → 1.7, tag `v0.1.0`) : https://machimoto.web.app, connexion Google réelle OK. Déploiement : `npm run deploy`, lancé par Maxime uniquement (interdit à Claude dans `.claude/settings.json`) ; `ci.yml` (4.2) requis sur `main` (ruleset, D14).
- Cadrage 0.2 fait : **Professeur Machimoto** (icône : Machimoto), `appId` `io.github.azaameth.machimoto`, pesées (`users/{uid}/pesees/{YYYY-MM-DD}`, `poids` et `note` chiffrés, date en clair), connexion Google uniquement. Détail : blocs 0.2 et 2.1 du plan, D15-D16.
- Suivi au quotidien : issues GitHub (label `pour-maxime` pour ses tâches), décisions D6 à D16 au Registre du plan.

---

## 5. Tâche demandée : générer le squelette — ✅ réalisée (PR #6)

Demande de Maxime : *« config Capacitor + Firebase, module de chiffrement, règles Firestore, workflow GitHub Actions »*.

Découpage conforme au plan (une PR par bloc, vérification à chaque fois) :

| Ordre | Bloc | Livrable | Faisable sans le cadrage 0.2 ? |
|---|---|---|---|
| 1 | 1.1 | Vite `react-ts`, `.node-version`, `.editorconfig`, ESLint, Prettier, Vitest, `.gitignore` sécurité, `base: './'`, scripts `dev/build/lint/test/emulators` | ✅ |
| 2 | 1.2 | `firebase.json` (émulateurs Auth, Firestore, Hosting, UI), `src/firebase.config.ts` (valeurs factices en attendant le projet), bascule auto sur émulateurs en dev | ✅ (projet réel à créer par Maxime) |
| 3 | 1.3 | Interfaces `core/`, `platform.ts`, contexte React, fausses implémentations en mémoire | ✅ |
| 4 | 1.4 | `src/core/crypto/` + tests Vitest (critères d'acceptation du plan) | ✅ |
| 5 | 1.5 | `firestore.rules` + `tests/rules/` avec `@firebase/rules-unit-testing` | ✅ |
| 6 | 4.2 (anticipé) | `.github/workflows/ci.yml` : lint, tests unitaires, tests de règles sous émulateur, build web | ✅ — à valider avec Maxime car hors ordre du plan |
| — | 3.1 | `capacitor.config.ts` | ❌ attend l'`appId` (bloc 0.2) et le jalon 3 |
| — | 4.3 | `release.yml` | ❌ attend le jalon 4 (keystore, secrets) |

**Proposition à faire à Maxime au démarrage :** faire 1 → 5 (+ `ci.yml` s'il valide), et poser en parallèle les questions du bloc 0.2. Ne pas créer Capacitor ni `release.yml` maintenant ; la config Vite est déjà compatible Capacitor (`base: './'`).

Vérifications de chaque bloc : voir `docs/plan-projet.md` (commandes prêtes à copier).

---

## 6. Points ouverts à clarifier en premier

1. Prochain : bloc **2.5** (tests hors ligne et conflits dans le navigateur), puis tag `v0.2.0`. Restitution : `docs/spec-restitution.md` (v1 faite au 2.6, v1.1 = bloc 6.1 ; question Q1 ouverte).
2. Architecture : 5 interfaces dans `Services` depuis le 2.4 (`AuthService`, `KeyStore`, `DataStore`, `PreferencesStore`, `FileExporter` — D26, D27).

Réglés le 2026-10-24 : OS (Arch, Flatpak), cadrage 0.2, D6 conflits, D12 verrouillage auto, D13 KeyStore Android — voir le Registre de `docs/plan-projet.md`.

---

## 7. Arborescence cible

```
<nom-app>/
├── .github/workflows/        # ci.yml, release.yml
├── android/                  # jalon 3
├── docs/                     # plan-projet.md, plan-installation-outils.md
├── src/
│   ├── core/
│   │   ├── auth/AuthService.ts
│   │   ├── keys/KeyStore.ts
│   │   ├── data/DataStore.ts
│   │   └── crypto/
│   ├── adapters/
│   │   ├── web/
│   │   └── native/           # jalon 3
│   ├── platform.ts
│   ├── features/
│   └── main.tsx
├── tests/rules/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .node-version
├── .gitignore
└── CLAUDE.md
```

---

## 8. Fin de chaque bloc

1. Faire passer la vérification du bloc.
2. Rappeler à Maxime de cocher la case dans `docs/plan-projet.md` (📍 Suivi).
3. Proposer une ligne pour le 📝 Journal (date, bloc, note).
4. Toute nouvelle décision → ligne dans le 🗂️ Registre des décisions.

---

## 9. Environnement constaté (2026-10-24)

- Arch Linux, VS Code en **Flatpak** (choix assumé). Outils ajoutés au bac à sable :
  - Node 26 et Java 21 via les extensions SDK (`FLATPAK_ENABLE_SDK_EXT=node26,openjdk21`, runtime 25.08) ;
  - `gh` en binaire dans `~/.local/bin`, authentifié par `gh auth login` + `gh auth setup-git` (jeton dans KWallet).
- Si une commande manque dans le bac à sable : `flatpak-spawn --host <commande>`.
- Jalon 3 : USB/adb accessible (`devices=all`), SDK Android à installer dans le dossier personnel.
- Configs rangées dans `config/` (ESLint, Prettier, Vite/Vitest, tsconfig.*) et `firebase/` (règles, index). Les scripts npm et `.vscode/settings.json` pointent dessus.
- Garde-fou secrets : `scripts/check-secrets.mjs` en pre-commit (`core.hooksPath = .githooks`, posé par `npm install`) et en CI.
