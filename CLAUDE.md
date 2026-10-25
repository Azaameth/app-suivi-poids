# CLAUDE.md — Professeur Machimoto (web + Android)

> Fichier de passation pour Claude Code. Documents de pilotage dans `docs/` :
> - `docs/plan-projet.md` → **source de vérité** (blocs, critères, 🗂️ Registre des décisions, 📝 Journal, arborescence)
> - `docs/plan-installation-outils.md` → environnement de dev
> - `docs/spec-restitution.md` → tableau de bord (tendance, rythme, projection) et ses arbitrages
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

| Domaine | Choix |
|---|---|
| Front | Vite + React + TypeScript, Zod |
| Backend | Firebase **plan Spark** (Auth Google + Firestore), `europe-west1`, projet `machimoto` |
| Chiffrement | Web Crypto, AES-GCM 256 sur `poids` / `note` ; clé de données encapsulée par PBKDF2-SHA256 (600 000 itérations) |
| Architecture | 5 interfaces dans `Services` : `AuthService`, `KeyStore`, `DataStore`, `PreferencesStore`, `FileExporter` ; adaptateurs `web/` puis `native/` ; choix dans `src/platform.ts` |
| Cache | Web : IndexedDB chiffré si « Garder mes données sur cet appareil » (défaut, D49), sinon mémoire ; effacé à la déconnexion. Android : cache natif Firestore |
| Mobile (jalon 3) | Capacitor + `@capacitor-firebase/authentication`, `@capacitor-firebase/firestore`, `@aparajita/capacitor-secure-storage`, `@capacitor/network` |
| Hébergement / CI | Firebase Hosting ; GitHub Actions (repo **public**), `main` protégée (PR + check `verify`) |
| Distribution | GitHub Releases + Obtainium |

---

## 3. Règles non négociables

### Règle d'or d'architecture (vérifiée par ESLint)
- `src/core/` : logique pure, aucune API de plateforme.
- `src/features/` n'importe **que** `src/core/` et les contextes React (sauf ses fichiers `*.test.*`).
- `firebase/*`, `@capacitor/*`, `localStorage`, `indexedDB` : **uniquement** dans `src/adapters/`.

### Sécurité (repo public)
| Élément | Commit ? |
|---|---|
| Config Firebase client (`apiKey`, `projectId`…) | ✅ oui |
| `firebase/firestore.rules`, `firestore.indexes.json` | ✅ oui |
| `google-services.json` | ❌ non (injecté par la CI) |
| `*.jks`, `*.keystore`, mots de passe | ❌ jamais (GitHub Secrets) |
| `service-account*.json`, `.env*` (sauf `.env.example`) | ❌ jamais |
| Données réelles | ❌ non, données fictives uniquement |

`scripts/check-secrets.mjs` tourne en pre-commit et en CI ; vérifier aussi `git status` avant chaque commit.

### Chiffrement
- IV aléatoire de 12 octets à **chaque** chiffrement ; format `v1:<iv_b64>:<data_b64>`.
- Aucun filtre / tri / index Firestore sur un champ chiffré (la date, en clair, sert d'identifiant et de tri).
- Web : clé et phrase secrète **en mémoire uniquement**. Session Google conservée par le SDK (D17).
- `users/{uid}/meta/keys` → `{ wrappedKey, salt, iterations, version, secours? }`, jamais écrasé (D25) ; `secours` = même clé encapsulée par le **code de secours** (D48), le code lui-même n'est jamais stocké.

### Firebase
- Règles en **liste explicite** (D19) : `meta/keys` et `pesees/{date}` ; tout le reste refusé.
- Dev et tests **uniquement sur émulateurs** (projet `demo-suivi-poids`, D8, D18).
- **Déploiement : par Maxime uniquement** (`npm run deploy`, interdit à Claude dans `.claude/settings.json`).
- Rester en Spark ; `onSnapshot` plutôt que des relectures.

### Conventions
- Branches `feat/<bloc>-<sujet>`, `fix/…`, `chore/…` → PR vers `main`. Ne supprimer une branche qu'une fois sa PR **fusionnée**.
- Conventional Commits ; tags `vX.Y.Z` ; `versionCode` Android = `X*10000 + Y*100 + Z`.
- Tout texte posté sur GitHub commence par `> 🤖 **Claude** · assistant IA (Claude Code), qui poste via le compte Azaameth`.
- Ne **jamais** remplir un `<À DÉFINIR>` ni changer une constante du registre sans le proposer.

---

## 4. Où on en est (2026-10-25)

- **Jalon 1** (socle web) : terminé, tag `v0.1.0`.
- **Jalon 2** (fonctionnel, blocs 2.1 → 2.6) : terminé ; tag `v0.2.0` à poser après merge du 2.5.
- Restitution : v1 faite (2.6) ; v1.1 (profil, objectif) = bloc 6.1, question Q1 ouverte (#24).
- **Prochain :** passe d'ergonomie des écrans (navigation, barre profil), puis **jalon 3 (APK)** : blocs 3.x de `plan-installation-outils.md` (SDK Android, adb) puis bloc 3.1 Capacitor.

---

## 5. Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` + `npm run emulators` | Appli en dev contre les émulateurs (UI : http://localhost:4000) |
| `npm run verify` | Secrets, lint, types, tests unitaires, build |
| `npm run test:emulateurs` | Règles, stockage, hors ligne, session (son propre émulateur, ports 8181 / 9199) |
| `npm run deploy` | Maxime uniquement : verify + test:emulateurs + Hosting et règles |

En dev, l'onglet « Export & réglages » propose des **outils de dev** (données fictives, absents du build de prod).

---

## 6. Outillage de Claude (`.claude/`, `scripts/`)

**Hooks** (`.claude/settings.json`, garanties automatiques — nés d'erreurs réelles) :
| Hook | Effet |
|---|---|
| `garde-fous.mjs` (avant Bash) | Refuse : un `git commit` sans `npm run verify` réussi sur l'état exact du code (+ `test:emulateurs` si `firebase/`, `tests/emulateurs/`, `src/core/`, `src/adapters/` changent ; docs seules dispensées) ; la suppression d'une branche dont la PR est ouverte ; un texte `gh` non signé ou passé par variable (utiliser `--body-file`) |
| `formater.mjs` (après Edit/Write) | Prettier sur le fichier modifié |
| `env` | `npm_config_loglevel=error` (masque les `npm warn` du Flatpak) |

**Skills** (`.claude/skills/`) :
| Skill | Quand |
|---|---|
| `lire-retours` | « regarde les issues », « j'ai répondu », « PR validée » : commentaires, revues, cases cochées, **messages de merge**, alertes |
| `ouvrir-pr` | Ouvrir une PR de bout en bout ; ménage après fusion (PR empilées, branches) |
| `fin-de-bloc` | Clôturer un bloc : vérifications + `scripts/plan.mjs` |
| `verifier-prod` | Après chaque `npm run deploy` d'Azaameth (lecture seule) |
| `trier-suggestions` | Suggestions des proches → issues, après accord |

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
- Les avertissements `npm warn Unknown env config "nodedir"` / `"tmp"` viennent du Flatpak : sans effet.
- Jalon 3 : USB/adb accessible (`devices=all`), SDK Android à installer dans le dossier personnel.
