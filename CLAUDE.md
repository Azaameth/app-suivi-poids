# CLAUDE.md — Professeur Machimoto (web + Android)

> Fichier de passation pour Claude Code. Documents de pilotage dans `docs/` :
>
> - `docs/plan-projet.md` → **source de vérité** (blocs, critères, 🗂️ Registre des décisions, 📝 Journal, arborescence)
> - `docs/plan-installation-outils.md` → environnement de dev
> - `docs/stack.md` → **stack technique** détaillée (versions, web / Android, décisions) : à tenir à jour à chaque changement de dépendance ou d'outil
> - `docs/spec-restitution.md` → tableau de bord (tendance, rythme, projection) et ses arbitrages
> - `README.md` (présentation) et `CONTRIBUTING.md` (poste neuf, workflow, déploiement) → pour les humains
>
> En cas de contradiction entre ce fichier et `docs/plan-projet.md`, **le plan projet gagne**.

---

## 1. Qui, quoi

- **Utilisateur :** Maxime (GitHub : Azaameth), développeur data/BI (SQL, Snowflake, Power BI, PHP, PowerShell). À l'aise en code, **moins familier du dev front/mobile** (React, PWA, Android, Capacitor) : expliquer brièvement les notions nouvelles, sans noyer.
- **Langue :** français. Réponses concises et directes.
- **Façon de travailler :** itérative, sur du code réel. Une PR par bloc, vérifications à chaque fois, attendre le résultat avant d'enchaîner. Questions et tâches pour Maxime → issues GitHub (label `pour-maxime`).
- **Téléphone de test :** Google Pixel 7 Pro.

**Projet :** suivi de poids perso, distribué en APK (pas de Play Store) avec une version web (https://machimoto.web.app). Données **chiffrées** de bout en bout, synchronisées avec Firebase, utilisables **hors ligne**. Ordre : web d'abord, puis APK ; ne pas sauter de jalon.

---

## 2. Stack (décidée — ne pas remettre en cause sans le proposer explicitement)

Résumé ci-dessous ; détail et versions dans `docs/stack.md`.

| Domaine          | Choix                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front            | Vite + React + TypeScript, Zod                                                                                                                                                                                   |
| Backend          | Firebase **plan Spark** (Auth Google ou e-mail, D53 + Firestore), `europe-west1`, projet `machimoto`                                                                                                             |
| Chiffrement      | Web Crypto, AES-GCM 256 sur `poids` / `note` ; clé de données encapsulée par PBKDF2-SHA256 (600 000 itérations)                                                                                                  |
| Architecture     | 5 interfaces dans `Services` : `AuthService`, `KeyStore`, `DataStore`, `PreferencesStore`, `FileExporter` ; adaptateurs `web/` puis `native/` ; choix dans `src/platform.ts`                                     |
| Cache            | Web : IndexedDB chiffré si « Garder mes données sur cet appareil » (défaut, D49), sinon mémoire ; effacé à la déconnexion ; service worker pour ouvrir l'appli hors ligne (D54). Android : cache natif Firestore |
| Mobile (jalon 3) | Capacitor 8 + `@capacitor-firebase/authentication`, `/firestore` (override firebase 13, D66), `@capacitor/network` ; KeyStore natif à trancher (#82). SDK Android en ligne de commande (D62) |
| Hébergement / CI | Firebase Hosting ; GitHub Actions (repo **public**), `main` protégée (PR + check `verify`)                                                                                                                       |
| Distribution     | GitHub Releases + Obtainium                                                                                                                                                                                      |

---

## 3. Règles non négociables

### Règle d'or d'architecture (vérifiée par ESLint)

- `src/core/` : logique pure, aucune API de plateforme.
- `src/features/` n'importe **que** `src/core/` et les contextes React (sauf ses fichiers `*.test.*`).
- `firebase/*`, `@capacitor/*`, `localStorage`, `indexedDB` : **uniquement** dans `src/adapters/`.

### Sécurité (repo public)

| Élément                                                | Commit ?                            |
| ------------------------------------------------------ | ----------------------------------- |
| Config Firebase client (`apiKey`, `projectId`…)        | ✅ oui                              |
| `firebase/firestore.rules`, `firestore.indexes.json`   | ✅ oui                              |
| `google-services.json`                                 | ❌ non (injecté par la CI)          |
| `*.jks`, `*.keystore`, mots de passe                   | ❌ jamais (GitHub Secrets)          |
| `service-account*.json`, `.env*` (sauf `.env.example`) | ❌ jamais                           |
| Données réelles                                        | ❌ non, données fictives uniquement |

`scripts/check-secrets.mjs` tourne en pre-commit et en CI ; vérifier aussi `git status` avant chaque commit.

### Chiffrement

- IV aléatoire de 12 octets à **chaque** chiffrement ; format `v1:<iv_b64>:<data_b64>`.
- Aucun filtre / tri / index Firestore sur un champ chiffré (la date, en clair, sert d'identifiant et de tri).
- Web : clé et phrase secrète **en mémoire uniquement**. Session Google conservée par le SDK (D17).
- `users/{uid}/meta/keys` → `{ wrappedKey, salt, iterations, version, secours? }`, jamais écrasé (D25) ; `secours` = même clé encapsulée par le **code de secours** (D48), le code lui-même n'est jamais stocké.

### Firebase

- Règles en **liste explicite** (D19) : `meta/keys`, `meta/profil` (D55), `pesees/{date}`, `suggestions/{id}` (D45) ; tout le reste refusé.
- Dev et tests **uniquement sur émulateurs** (projet `demo-suivi-poids`, D8, D18).
- **Déploiement : par Maxime uniquement** (`npm run deploy`, interdit à Claude dans `.claude/settings.json`).
- Rester en Spark ; `onSnapshot` plutôt que des relectures.

### Conventions

- Branches `feat/<bloc>-<sujet>`, `fix/…`, `chore/…` → PR vers `main`. Ne supprimer une branche qu'une fois sa PR **fusionnée**.
- Conventional Commits ; tags `vX.Y.Z` ; `versionCode` Android = `X*10000 + Y*100 + Z`.
- Tout texte posté sur GitHub commence par `> 🤖 **Claude** · assistant IA (Claude Code), qui poste via le compte Azaameth`.
- Ne **jamais** remplir un `<À DÉFINIR>` ni changer une constante du registre sans le proposer.

---

## 4. Où on en est (2026-11-23)

- **Jalon 1** (socle web) : terminé, tag `v0.1.0`.
- **Jalon 2** (fonctionnel, blocs 2.1 → 2.14) : terminé et en production ; tags `v0.2.0`, `v0.2.1`, `v0.3.0` (2.9 à 2.14, 6.1, graphique explorable).
- Restitution : v1 faite (2.6) ; **v1.1 (objectif, profil, IMC) = bloc 6.1, avancé avant le jalon 3 (D55), terminé et déployé** ; Q1 tranchée (D56) ; infobulles d'explication proposées (#44). Import CSV robuste et export « Pour Excel » (#64, D59) ; ergonomie coffre / graphique (#65) ; graphique explorable et légende par couche (#70, D60, validé sur le Pixel le 2026-11-23).
- **Idée suivante :** cercles de proches, partage chiffré du suivi (#74), après la `v1.0.0` (blocs 6.2 → 6.8 proposés).
- Avant le jalon 3 : tests accélérés (#62, `npm test` 9,7 s → 4,8 s) ; audit de dette (skill `audit-dette`), graphique découpé (`cadre.ts`, `useExploration.ts`), `check:exports`.
- **Jalon 3 (APK)** : SDK Android en ligne de commande et 3 émulateurs (D62) ; bloc 3.1 Capacitor fait (`npm run android`, D63 : config Firebase choisie par `MODE`, D64 : pas de service worker sur Android).
- **Prochain :** bloc 3.2 (Firebase Android, SHA-1 : console Firebase par Maxime), puis 3.3 (adaptateurs natifs). Liste de Maxime à son retour : #78.

---

## 5. Commandes

| Commande                            | Rôle                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` + `npm run emulators` | Appli en dev contre les émulateurs (UI : http://localhost:4000)                                                             |
| `npm run android`                   | APK de dev (projet fictif, garde-fou anti-production) installé et lancé sur l'appareil branché ; voir la skill `android`     |
| `npm run verify`                    | Secrets, exports inutilisés, lint, types, tests unitaires, tests des outils, build                                          |
| `npm run test:emulateurs`           | Règles, stockage, hors ligne, session (son propre émulateur, ports 8181 / 9199)                                             |
| `npm run suggestions`               | Suggestions des proches en prod (SDK Admin, lecture seule ; `--aide`, `--emulateur`) : Maxime, ou Claude **sur sa demande** |
| `npm run deploy`                    | Maxime uniquement : verify + test:emulateurs + Hosting et règles                                                            |

En dev, l'onglet « Réglages » propose des **outils de dev** (données fictives, absents du build de prod).

---

## 6. Outillage de Claude (`.claude/`, `scripts/`)

**Hooks** (`.claude/settings.json`, garanties automatiques — nés d'erreurs réelles) :

| Hook                               | Effet                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `garde-fous.mjs` (avant Bash)      | Refuse : un `git commit` sans `npm run verify` réussi sur l'état exact du code (+ `test:emulateurs` si `firebase/`, `tests/emulateurs/`, `src/core/`, `src/adapters/` changent ; docs seules dispensées) ; la suppression d'une branche dont la PR est ouverte ; un texte `gh` non signé ou passé par variable (utiliser `--body-file`) ; un `pkill -f <motif>` sans crochets (le shell se tuerait lui-même) ; un `prettier --write` sans `--ignore-path config/prettierignore` (CLAUDE.md et `docs/` en sont exclus) |
| `formater.mjs` (après Edit/Write)  | Prettier sur le fichier modifié                                                                                                                                                                                                                                                                                                                                                                              |
| `demarrage.mjs` (début de session) | 2-3 lignes : poste, Node / `node_modules`, `gh`, Java, branche, rebase en cours, worktrees, ports déjà pris                                                                                                                                                                                                                                                                                                  |
| `env`                              | `npm_config_loglevel=error` (masque les `npm warn` du Flatpak)                                                                                                                                                                                                                                                                                                                                               |

**Skills** (`.claude/skills/`) :

| Skill               | Quand                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lire-retours`      | « regarde les issues », « j'ai répondu », « PR validée » : commentaires, revues, cases cochées, **messages de merge**, alertes                                    |
| `ouvrir-pr`         | Ouvrir une PR de bout en bout ; ménage après fusion (PR empilées, branches)                                                                                       |
| `fin-de-bloc`       | Clôturer un bloc : vérifications + `scripts/plan.mjs`                                                                                                             |
| `verifier-prod`     | Après chaque `npm run deploy` d'Azaameth (lecture seule)                                                                                                          |
| `trier-suggestions` | Suggestions des proches → issues, après accord                                                                                                                    |
| `voir-appli`        | Changement d'interface ou défaut visuel : émulateurs + Vite en arrière-plan (`env-dev.mjs`), captures Playwright mobile / bureau, clair / sombre (`captures.mjs`) |
| `audit-dette`       | Avant chaque jalon, ou « regarde la dette / refactorise » : mesures (code mort, CSS, gros fichiers, tests lents), refactoring vérifié par captures avant / après identiques |
| `android`           | Jalon 3 : émulateur sans fenêtre (Pixel 7 Pro, moderne 16 Ko, Canary), `npm run android`, pilotage de la WebView par Playwright (`webview.mjs`), logs |

**Agent** (`.claude/agents/`) : `inspecteur-visuel` (Sonnet) lit des captures et renvoie un compte
rendu court. Il garde le contexte léger mais coûte plus de tokens au total (≈ 49 k pour 4 images,
contre ≈ 6 k en les lisant soi-même) : seulement pour les longues séries (≳ 8 captures).

**Sessions en parallèle** : une session par **worktree** (`git worktree add ../app-suivi-poids-<sujet>`),
jamais deux dans le même dossier (changements de branche sous les pieds de l'autre).

**Scripts** : `scripts/plan.mjs` (cocher / critère / journal / décision dans le plan, jamais à la main) ;
`scripts/empreinte.mjs` (empreinte du code enregistrée par `verify` et `test:emulateurs`, dans `.claude/etat/`, ignoré par Git).

## 7. Fin de chaque bloc

Skill `fin-de-bloc` : vérifications, `git status`, case 📍 Suivi, ligne de 📝 Journal, décisions au 🗂️ Registre.

---

## 8. Environnement constaté

- Arch Linux, VS Code en **Flatpak** (choix assumé, D9). Outils ajoutés au bac à sable :
  - Node 26 et Java 21 via les extensions SDK (`FLATPAK_ENABLE_SDK_EXT=node26,openjdk21`, runtime 25.08) ;
  - `gh` en binaire dans `~/.local/bin`, authentifié (jeton dans KWallet).
- Commande absente du bac à sable : `flatpak-spawn --host <commande>`.
- **Second poste « Bobby II »** (Arch natif, hors Flatpak) : Node 24 via nvm, `gh` (pacman, jeton dans le trousseau), Java 21 par défaut (`archlinux-java`), `gcloud` (AUR) pour `npm run suggestions`.
- **Session cloud Claude Code** (claude.ai, environnement personnel `app-suivi-poids`) : Ubuntu, Node 24, Java 21, SDK Android dans `~/Android/Sdk`, installés par le script de l'environnement. Réseau limité (paquets + `dl.google.com`). GitHub : `gh api` (REST) et outils MCP, **pas de GraphQL** (`gh pr …`, `gh issue …` refusés) ; scripts et skills passent donc tous par REST. Pas de KVM : APK compilable (`npm run android -- --apk`), pas d'émulateur. Branche imposée par la session (`claude/…`).
- Les avertissements `npm warn Unknown env config "nodedir"` / `"tmp"` viennent du Flatpak : sans effet.
- Jalon 3 : USB/adb accessible (`devices=all`), SDK Android à installer dans le dossier personnel.
