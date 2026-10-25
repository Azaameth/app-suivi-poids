# Contribuer à Professeur Machimoto

Ce guide permet de **reprendre le projet sur un poste neuf** (Windows, macOS ou Linux) et d'y
contribuer en respectant ses règles. Il complète le [README](README.md), qui présente l'appli.

## Sommaire

1. [Installer le poste](#1-installer-le-poste)
2. [Récupérer et lancer le projet](#2-récupérer-et-lancer-le-projet)
3. [Workflow : de l'idée à la production](#3-workflow--de-lidée-à-la-production)
4. [Règles du code](#4-règles-du-code)
5. [Tests](#5-tests)
6. [Sécurité (repo public)](#6-sécurité-repo-public)
7. [Déploiement et release (mainteneur)](#7-déploiement-et-release-mainteneur)
8. [Configuration des services externes](#8-configuration-des-services-externes)
9. [Dépannage](#9-dépannage)
10. [Travailler avec Claude Code](#10-travailler-avec-claude-code)

---

## 1. Installer le poste

| Outil                 | Version                      | Pourquoi                                                    |
| --------------------- | ---------------------------- | ----------------------------------------------------------- |
| **Git**               | récente                      | Versionnement                                               |
| **Node.js**           | **24 LTS** (`.node-version`) | Build, tests, CLI Firebase (fournie par `npm install`)      |
| **Java (JDK)**        | **21**                       | Les émulateurs Firebase (Auth, Firestore) tournent sur Java |
| **GitHub CLI** (`gh`) | récente, facultatif          | PR, issues, CI depuis le terminal                           |
| **VS Code**           | facultatif                   | Extensions recommandées proposées à l'ouverture             |

La **CLI Firebase n'a pas besoin d'être installée globalement** : elle fait partie des
dépendances de dev, et les scripts `npm` l'utilisent directement (`npx firebase …` sinon).

<details>
<summary><strong>Windows</strong></summary>

```powershell
winget install Git.Git GitHub.cli Schniz.fnm EclipseAdoptium.Temurin.21.JDK
# Nouveau terminal, puis :
fnm env --use-on-cd | Out-String | Invoke-Expression   # à ajouter au profil PowerShell
fnm install 24 ; fnm default 24
```

Si les scripts `npm` échouent sur les guillemets, lancez-les depuis **Git Bash** ou WSL.

</details>

<details>
<summary><strong>macOS</strong></summary>

```sh
brew install git gh fnm
brew install --cask temurin@21
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc && exec zsh
fnm install 24 && fnm default 24
```

</details>

<details>
<summary><strong>Linux</strong></summary>

- **Arch** : guide pas à pas dans [docs/plan-installation-outils.md](docs/plan-installation-outils.md)
  (poste d'origine : VS Code en Flatpak, voir la décision D9).
- **Debian / Ubuntu** :

```sh
sudo apt install git openjdk-21-jdk gh
curl -fsSL https://fnm.vercel.app/install | bash && exec $SHELL
fnm install 24 && fnm default 24
```

</details>

**Vérification** (les trois commandes doivent répondre) :

```sh
node --version    # v24.x
java -version     # 21.x
git --version
```

## 2. Récupérer et lancer le projet

```sh
git clone https://github.com/Azaameth/app-suivi-poids.git
cd app-suivi-poids
npm install
```

`npm install` branche aussi le **hook pre-commit** (`.githooks/pre-commit`), qui refuse tout
commit contenant un secret. Il passe par `git config core.hooksPath .githooks`, exécuté
automatiquement (script `prepare`).

Ensuite, dans deux terminaux :

```sh
npm run emulators   # émulateurs Auth + Firestore, UI sur http://localhost:4000
npm run dev         # appli sur http://localhost:5173
```

- Le **premier lancement** des émulateurs télécharge leurs fichiers (≈ 100 Mo, une seule fois).
- En dev, l'appli parle **uniquement aux émulateurs** (projet fictif `demo-suivi-poids`, D8 et
  D18). Aucun compte Firebase n'est nécessaire et la production ne peut pas être touchée.
- Connexion par e-mail : créez un compte quelconque, il n'existe que dans l'émulateur ; les e-mails
  de réinitialisation s'affichent dans l'UI des émulateurs (onglet Authentication).
- La connexion Google de l'émulateur propose un **compte fictif** : cliquez sur « Add new
  account ».
- Les données des émulateurs sont gardées dans `.emulator-data/` (ignoré par Git) d'une session à
  l'autre. Supprimez ce dossier pour repartir de zéro.
- Le **service worker** (appli hors ligne, bloc 2.14) est désactivé en dev. Pour l'essayer :
  `npm run build && npm run preview`, puis DevTools → Application → Service workers.
- **Réglages → Outils de dev** génère des pesées fictives (absent du build de production).

**Contrôle final** avant de coder :

```sh
npm run verify && npm run test:emulateurs
```

Les deux commandes doivent finir sans erreur. C'est exactement ce que vérifie la CI.

## 3. Workflow : de l'idée à la production

1. **Une idée, un bug, une question** → une issue GitHub. Le label `pour-maxime` signale ce qui
   attend une décision du mainteneur.
2. **Le plan d'abord.** [docs/plan-projet.md](docs/plan-projet.md) est la **source de vérité** :
   blocs, critères d'acceptation, 🗂️ Registre des décisions, 📝 Journal. Un changement de cap se
   **propose** et s'inscrit au registre (`Dxx`) ; on ne modifie pas une décision en silence.
3. **Une branche par bloc ou par correction**, créée depuis `main` à jour :

   | Préfixe               | Usage                            | Exemple              |
   | --------------------- | -------------------------------- | -------------------- |
   | `feat/<bloc>-<sujet>` | Fonctionnalité d'un bloc du plan | `feat/3.1-capacitor` |
   | `fix/<sujet>`         | Correction                       | `fix/focus-modale`   |
   | `chore/<sujet>`       | Outillage, doc, dépendances      | `chore/audit-doc`    |

4. **Commits** au format [Conventional Commits](https://www.conventionalcommits.org/fr/) :
   `feat(2.12): import CSV avec aperçu`, `fix: …`, `docs: …`, `chore: …`, `test: …`.
5. **Avant de pousser** : `npm run verify`. Ajoutez `npm run test:emulateurs` si vous touchez à
   `firebase/`, `src/core/`, `src/adapters/` ou `tests/emulateurs/`.
6. **Pull request vers `main`** : le modèle (`.github/pull_request_template.md`) demande le
   contexte, les vérifications faites et une checklist de test manuel.
7. **CI** : le check `verify` (anti-secrets, lint, types, tests unitaires, tests des outils,
   tests sous émulateurs, build) doit passer. `main` est protégée (D14) : PR obligatoire, check
   requis, ni force-push ni suppression.
8. **Fin de bloc** : cocher le bloc et ses critères, ajouter la ligne de Journal et les décisions,
   **toujours via le script** (jamais à la main) :

   ```sh
   node scripts/plan.mjs cocher 3.1
   node scripts/plan.mjs critere "extrait unique du critère"
   node scripts/plan.mjs journal 3.1 "Ce qui a été fait, ce qui a été appris."
   node scripts/plan.mjs decision "Décision" "Pourquoi" "Alternatives écartées"
   ```

9. **Fusion** par le mainteneur, puis suppression de la branche (seulement une fois **fusionnée**).
10. **Déploiement** par le mainteneur (§ 7).

## 4. Règles du code

### Règle d'or d'architecture (vérifiée par ESLint)

| Dossier         | Peut importer                      | Interdit                                                  |
| --------------- | ---------------------------------- | --------------------------------------------------------- |
| `src/core/`     | rien d'autre que `core/` (et Zod)  | toute API de plateforme : Firebase, DOM, `localStorage`…  |
| `src/features/` | `src/core/` et les contextes React | `firebase/*`, `@capacitor/*`, `localStorage`, `indexedDB` |
| `src/adapters/` | tout                               | —                                                         |

Les écrans passent par les **5 interfaces** de `Services` (`AuthService`, `KeyStore`,
`DataStore`, `PreferencesStore`, `FileExporter`), fournies par le contexte React.
`src/platform.ts` choisit les adaptateurs (web aujourd'hui, natifs au jalon 3).

### Chiffrement (non négociable)

- AES-GCM 256, **IV aléatoire de 12 octets à chaque chiffrement**, format `v1:<iv_b64>:<data_b64>`.
- Le chiffrement se fait dans `core/pesees` (`PeseeRepository`, D22) : le `DataStore` ne voit que
  du chiffré.
- **Aucun filtre, tri ni index Firestore sur un champ chiffré.** La date, en clair, sert
  d'identifiant et de tri.
- Sur le web, la clé et la phrase restent **en mémoire uniquement**.
- `users/{uid}/meta/keys` n'est **jamais écrasé** (D25).

### Firestore

- Règles en **liste explicite** (D19) : `meta/keys`, `pesees/{date}`, `suggestions/{id}`.
  Tout le reste est refusé.
- Toute évolution du modèle met à jour **ensemble** : le schéma Zod (`core/`), les règles
  (`firebase/firestore.rules`) et leurs tests (`tests/emulateurs/firestore.rules.test.ts`).
- On reste dans le plan gratuit (Spark) : `onSnapshot` plutôt que des relectures en boucle.

### Style

- TypeScript strict, Prettier (`config/prettier.json` : sans point-virgule, guillemets simples,
  100 colonnes). `npm run format` corrige tout.
- **Code et commentaires en français**, comme le reste du projet : noms métier en français
  (`pesee`, `tendance`), termes techniques usuels en anglais acceptés (`DataStore`, `watch`).
- Commentaires rares et utiles : le **pourquoi**, avec la référence de décision (`D35`) quand il y
  en a une.
- Interface : texte en français, tutoiement, ton chaleureux et **jamais culpabilisant** : une
  baisse n'est pas forcément un progrès, d'où des couleurs neutres (D33).
  Accessibilité : nom accessible sur chaque bouton, images décoratives `alt=""`, focus visible.

## 5. Tests

| Suite                  | Commande                  | Contenu                                                     |
| ---------------------- | ------------------------- | ----------------------------------------------------------- |
| Unitaires et interface | `npm test`                | `src/**/*.test.ts(x)` : Vitest + jsdom, services en mémoire |
| Sous émulateurs        | `npm run test:emulateurs` | Règles Firestore, stockage, hors ligne, session             |
| Outils                 | `npm run test:outils`     | Hooks de Claude Code et scripts (`node --test`)             |

- Les tests d'interface utilisent `src/test/appHarness.tsx` (connexion, création du coffre…)
  et les adaptateurs `src/adapters/memory/`.
- `test:emulateurs` lance **ses propres émulateurs** (ports 8181 et 9199) : il peut tourner
  pendant que `npm run emulators` est ouvert.
- Interface asynchrone : préférez `findBy…` et attendez la fin des « Chargement… » ; les tests
  ont déjà été instables pour cette raison.
- Une correction de bug s'accompagne d'un test qui **échouait avant** la correction.

## 6. Sécurité (repo public)

| Élément                                                | Dans le repo ?                          |
| ------------------------------------------------------ | --------------------------------------- |
| Config Firebase client (`apiKey`, `projectId`…)        | ✅ oui, ce n'est pas un secret (D43)    |
| `firebase/firestore.rules`, `firestore.indexes.json`   | ✅ oui                                  |
| `google-services.json`                                 | ❌ non, injecté par la CI (jalon 3)     |
| Keystore `*.jks` / `*.keystore` et leurs mots de passe | ❌ jamais : GitHub Secrets              |
| `service-account*.json`, `.env*` (sauf `.env.example`) | ❌ jamais                               |
| **Données réelles** (pesées, exports CSV)              | ❌ jamais : données fictives uniquement |

`scripts/check-secrets.mjs` tourne en pre-commit et en CI. Relisez quand même `git status`
avant chaque commit. Pour signaler une faille : [SECURITY.md](SECURITY.md).

## 7. Déploiement et release (mainteneur)

### Prérequis (une fois par poste)

```sh
npx firebase login          # compte Google ayant accès au projet « machimoto »
npx firebase projects:list  # « machimoto » doit apparaître
```

### Déployer

Depuis `main` à jour, sans modification locale :

```sh
git switch main && git pull
npm run deploy
```

`deploy` relance `verify` et `test:emulateurs`, puis publie **Hosting** et les **règles
Firestore** sur `machimoto`. Vérifiez ensuite https://machimoto.web.app : version affichée dans
le menu du profil, connexion, déverrouillage, une saisie.

### Version et tag

- Numéro dans `package.json` (`version`), au format `MAJEUR.MINEUR.CORRECTIF`. Il est affiché
  dans l'appli et joint aux suggestions.
- Tag annoté après fusion :

  ```sh
  git tag -a v0.3.0 -m "v0.3.0 : …" && git push origin v0.3.0
  ```

- Android (jalon 3) : `versionCode = MAJEUR*10000 + MINEUR*100 + CORRECTIF` (`v1.2.3` → `10203`).
  Distribution par GitHub Releases + Obtainium (jalon 4).

## 8. Configuration des services externes

Ces réglages vivent **hors du repo**. Ils ne servent qu'à recréer ou vérifier l'environnement de
production.

| Service       | Réglage                                                                                                                                                                    | Décision |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Firebase      | Projet `machimoto`, plan **Spark**, Firestore en `europe-west1`                                                                                                            | D18      |
| Firebase Auth | Fournisseurs **Google** et **Adresse e-mail/Mot de passe** (D53) ; domaines autorisés : `machimoto.web.app`, `machimoto.firebaseapp.com`, `localhost`                      | D15, D53 |
| Google Cloud  | Clé d'API web restreinte aux référents `https://machimoto.web.app/*`, `https://machimoto.firebaseapp.com/*`, et aux API Identity Toolkit, Token Service et Cloud Firestore | D43      |
| GitHub        | Ruleset sur `main` (PR + check `verify`, ni force-push ni suppression) ; secret scanning activé ; Dependabot                                                               | D14      |

Les **suggestions** des proches (🗨️) se lisent dans la console Firestore, sous
`users/{uid}/suggestions`.

## 9. Dépannage

| Symptôme                                         | Cause probable et solution                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| « Connexion au serveur impossible » en dev       | Les émulateurs ne tournent pas : `npm run emulators`                                                                                             |
| `npm run emulators` : _Could not spawn java_     | Java 21 absent ou hors du `PATH` : `java -version`                                                                                               |
| Port 8080, 9099 ou 4000 déjà utilisé             | Un ancien émulateur tourne encore : fermez-le (Linux/macOS : `lsof -i :8080` pour le trouver)                                                    |
| Ancienne version de l'appli après un déploiement | Le service worker attend : bandeau « Mettre à jour », ou fermer tous les onglets ; en dev, DevTools → Application → Service workers → Unregister |
| `npm warn Unknown env config "nodedir"`          | Spécifique au VS Code Flatpak du poste d'origine : sans effet                                                                                    |
| Commit refusé par _check-secrets_                | Un motif de secret a été détecté : retirez le fichier ou la valeur, ne contournez pas le hook                                                    |
| Test d'interface instable                        | Une requête part avant la fin du chargement : `findBy…`, ou attendre la disparition de « Chargement… »                                           |
| `npm run deploy` : _permission denied_           | `npx firebase login` avec le bon compte Google                                                                                                   |

## 10. Travailler avec Claude Code

Le projet est développé avec [Claude Code](https://claude.com/claude-code). Son outillage est
versionné dans `.claude/` et décrit dans [CLAUDE.md](CLAUDE.md) :

- **Hooks** (garanties automatiques) : pas de commit sans `verify` réussi sur le code exact,
  pas de suppression d'une branche dont la PR est ouverte, textes GitHub signés, formatage
  automatique.
- **Skills** : `ouvrir-pr`, `fin-de-bloc`, `lire-retours`, `verifier-prod`, `trier-suggestions`.
- Claude **ne déploie jamais** (`npm run deploy` lui est interdit) et signe tout texte qu'il
  poste sur GitHub.

Sans Claude Code, ces fichiers sont simplement ignorés : le workflow ci-dessus reste valable tel
quel.
