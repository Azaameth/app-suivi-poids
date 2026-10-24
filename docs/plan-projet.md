# Plan projet — Appli perso (web + Android)
 
> **Document de pilotage.** Il complète `plan-installation-outils.md` (environnement de dev) et se met à jour au fil du projet.
> Les éléments fonctionnels propres à l'appli sont laissés en `<À DÉFINIR>`.
 
---
 
## 🤖 Instructions pour Claude (à lire en premier)
 
Tu accompagnes l'utilisateur dans la réalisation de ce projet.
 
1. Lis la section **📍 Suivi** pour savoir où on en est. Ne refais pas ce qui est coché.
2. Avance **un bloc à la fois** : rappelle l'objectif du bloc, produis les livrables, puis fais exécuter la **vérification**. On ne passe au bloc suivant qu'une fois **tous les critères d'acceptation** cochés.
3. Respecte les **🧭 Conventions** et les décisions du **🗂️ Registre des décisions**. Si tu veux en changer une, propose-le explicitement et fais-le ajouter au registre.
4. Ne remplis jamais un `<À DÉFINIR>` toi-même : pose la question à l'utilisateur.
5. Avant tout commit, vérifie qu'aucun secret ne part dans le repo public (voir **🔐 Règles de sécurité**).
6. À la fin de chaque bloc, rappelle à l'utilisateur de cocher la case et de compléter le **📝 Journal**.
---
 
## 🧱 Socle technique (décidé)
 
| Domaine | Choix |
|---|---|
| Front | Vite + React + TypeScript |
| Backend | Firebase, plan Spark (Auth + Firestore) |
| Chiffrement | AES-GCM sur les champs sensibles ; clé de données encapsulée par une clé dérivée de la phrase secrète (PBKDF2) |
| Architecture | 3 interfaces : `AuthService`, `KeyStore`, `DataStore`. Une version web et une version native (adaptateurs) |
| Cache local | Web : en mémoire uniquement. Android : cache natif Firestore |
| Mobile | Capacitor (Android) + plugins `@capacitor-firebase/*`, stockage sécurisé dans le Keystore |
| Hébergement web | Firebase Hosting |
| CI/CD | GitHub Actions (repo public) |
| Distribution | GitHub Releases + Obtainium |
 
---
 
## 📍 Suivi
 
| Bloc | Jalon | Contenu | Fait |
|---|---|---|---|
| 0.1 | Prérequis | Environnement installé (plan d'installation, jalons 1 et 2) | [ ] |
| 0.2 | Prérequis | Cadrage fonctionnel minimal | [x] |
| 1.1 | Socle web | Initialisation du repo et de l'outillage | [x] |
| 1.2 | Socle web | Projet Firebase + émulateurs | [x] |
| 1.3 | Socle web | Interfaces et sélection des adaptateurs | [x] |
| 1.4 | Socle web | Module de chiffrement | [x] |
| 1.5 | Socle web | Règles Firestore + tests | [x] |
| 1.6 | Socle web | Authentification web | [ ] |
| 1.7 | Socle web | Déploiement sur Firebase Hosting | [ ] |
| 2.1 | Fonctionnel | Modèle de données | [ ] |
| 2.2 | Fonctionnel | DataStore web + état de la synchro | [ ] |
| 2.3 | Fonctionnel | Déverrouillage et gestion de la phrase secrète | [ ] |
| 2.4 | Fonctionnel | Écrans métier | [ ] |
| 2.5 | Fonctionnel | Tests hors ligne et conflits (navigateur) | [ ] |
| 3.1 | APK | Ajout de Capacitor Android | [ ] |
| 3.2 | APK | Configuration Firebase Android (SHA-1) | [ ] |
| 3.3 | APK | Adaptateurs natifs | [ ] |
| 3.4 | APK | Icônes, écran de démarrage, nom de l'appli | [ ] |
| 3.5 | APK | Tests sur téléphone | [ ] |
| 4.1 | Distribution | Signature de release | [ ] |
| 4.2 | Distribution | CI sur les pull requests | [ ] |
| 4.3 | Distribution | Workflow de release (tag → APK + Hosting) | [ ] |
| 4.4 | Distribution | Première release + Obtainium | [ ] |
| 5.1 | Maintenance | Dépendances, sauvegardes, surveillance | [ ] |
 
---
 
## 🧭 Conventions
 
**Branches :** `main` toujours déployable. Le travail se fait sur `feat/<bloc>-<sujet>` (ex. `feat/1.4-crypto`), puis passe par une pull request vers `main`.
 
**Commits :** [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`.
 
**Versions :** tags `vMAJEUR.MINEUR.CORRECTIF`. Le `versionCode` Android se calcule à partir du tag (`v1.2.3` → `10203`).
 
**Arborescence cible :**
```
<nom-app>/
├── .github/workflows/        # ci.yml, release.yml
├── android/                  # généré par Capacitor (jalon 3)
├── docs/                     # plan-projet.md, plan-installation-outils.md
├── src/
│   ├── core/                 # interfaces + logique métier (aucune API de plateforme)
│   │   ├── auth/AuthService.ts
│   │   ├── keys/KeyStore.ts
│   │   ├── data/DataStore.ts
│   │   └── crypto/           # AES-GCM, PBKDF2, encapsulation de la clé
│   ├── adapters/
│   │   ├── web/              # versions web (SDK JS Firebase, clé en mémoire)
│   │   └── native/           # versions Capacitor (jalon 3)
│   ├── platform.ts           # choix des adaptateurs selon la plateforme
│   ├── features/             # écrans et composants par fonctionnalité
│   └── main.tsx
├── tests/
│   └── rules/                # tests des règles Firestore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── capacitor.config.ts
├── .node-version
└── .gitignore
```
 
**Règle d'or :** les composants React n'importent **que** des éléments de `core/` ou des contextes React. Jamais `firebase/*`, `@capacitor/*` ni `localStorage` directement.
 
---
 
## 🔐 Règles de sécurité (repo public)
 
| Élément | Dans le repo ? |
|---|---|
| Config Firebase client (`apiKey`, `projectId`…) | ✅ Oui, ce n'est pas un secret |
| `firestore.rules` | ✅ Oui |
| `google-services.json` | ❌ Non : injecté par la CI depuis un secret |
| Keystore `.jks` / `.keystore` et ses mots de passe | ❌ Jamais : GitHub Secrets uniquement |
| `service-account*.json`, `.env*` (hors `.env.example`) | ❌ Jamais |
| Données de test réelles | ❌ Non : utiliser des données fictives |
 
---
 
# Jalon 0 — Prérequis
 
## Bloc 0.1 — Environnement
**Objectif :** blocs 0 à 2 de `plan-installation-outils.md` terminés.
 
**✅ Vérification :** la vérification de fin du jalon 1 de `plan-installation-outils.md` passe sans erreur.
 
## Bloc 0.2 — Cadrage fonctionnel minimal
**Objectif :** avoir juste assez de cadrage pour concevoir le modèle de données.
 
| Question | Réponse |
|---|---|
| Nom de l'appli | Titre : **Professeur Machimoto** · nom sous l'icône : **Machimoto** |
| Identifiant du package | `io.github.azaameth.machimoto` (définitif) |
| Fonctionnalités de la v1 | 1. Saisir une pesée (date, poids, note facultative) · 2. Historique (modifier, supprimer) · 3. Graphique d'évolution (30 j / 90 j / 1 an / tout) · 4. Export CSV (sert aussi de sauvegarde) |
| Données manipulées | Pesées ; plus tard un profil (taille, objectif) en v1.1 |
| Données sensibles à chiffrer | `poids`, `note` (puis `taille`, `objectif` en v1.1) |
| Utilisateurs / partage | Un seul utilisateur, aucun partage |
| Méthode de connexion | Google uniquement (en dev : comptes fictifs de l'émulateur Auth) |

**Critères d'acceptation**
- [x] Toutes les lignes sont remplies
- [x] Les champs chiffrés n'ont pas besoin d'être filtrés ou triés côté serveur (seule la date, en clair, sert au tri et au filtre)
---
 
# Jalon 1 — Socle web
 
> **Ce qui évite de s'enfermer (lock-in) :** l'authentification, la clé et les données passent par 3 interfaces. Plus tard, seul l'adaptateur change.
 
## Bloc 1.1 — Initialisation du repo et de l'outillage
**Livrables**
- Projet Vite `react-ts`, `.node-version`, `.editorconfig`
- ESLint + Prettier + Vitest configurés
- `vite.config.ts` compatible Capacitor : `base: './'`, sortie dans `dist/`
- `.gitignore` conforme aux règles de sécurité
- Repo GitHub public créé, `main` protégée (pull request obligatoire)
- Scripts npm : `dev`, `build`, `lint`, `test`, `emulators`
**Critères d'acceptation**
- [x] `npm run lint && npm test && npm run build` passent
- [x] `dist/index.html` utilise des chemins relatifs (`./assets/...`)
**✅ Vérification**
```bash
npm run lint && npm test -- --run && npm run build && grep -o 'src="./assets' dist/index.html
```
 
## Bloc 1.2 — Projet Firebase + émulateurs
**Livrables**
- Projet Firebase créé (compte perso), plan **Spark**
- Auth activée (méthode du bloc 0.2), Firestore créé (région UE, ex. `europe-west1`)
- `firebase.json` : émulateurs Auth, Firestore, Hosting et interface web
- Config client dans `src/firebase.config.ts`
- Connexion automatique aux émulateurs en mode dev
**Critères d'acceptation**
- [x] `npm run emulators` démarre, interface accessible sur http://localhost:4000
- [x] L'appli en `dev` écrit dans l'**émulateur**, pas en production
**✅ Vérification**
```bash
npm run emulators   # puis, dans un 2e terminal : npm run dev
```
 
## Bloc 1.3 — Interfaces et sélection des adaptateurs
**Livrables**
- `AuthService` : `signIn()`, `signOut()`, `currentUser()`, `onAuthChange()`
- `KeyStore` : `save(key)`, `load()`, `clear()`
- `DataStore` : `get()`, `list()`, `watch()`, `put()`, `remove()`, `syncState()`
- `platform.ts` : renvoie les adaptateurs web (les natifs viendront au jalon 3)
- Contexte React qui fournit les services aux composants
- Fausses implémentations en mémoire pour les tests
**Critères d'acceptation**
- [x] Aucun import `firebase/*` en dehors de `src/adapters/`
- [x] Tests unitaires de `core/` qui utilisent les fausses implémentations
**✅ Vérification**
```bash
grep -rn "from 'firebase" src --include=*.ts* | grep -v "src/adapters/" || echo "OK : Firebase isolé"
```
 
## Bloc 1.4 — Module de chiffrement
**Livrables**
- `crypto/` basé sur la Web Crypto API (aucune dépendance externe) :
  - `deriveKey(phrase, sel)` : PBKDF2-SHA256, nombre d'itérations élevé et documenté
  - `generateDataKey()` : clé AES-GCM 256 bits
  - `wrapKey()` / `unwrapKey()` : encapsulation de la clé de données par la clé dérivée de la phrase
  - `encryptField()` / `decryptField()` : vecteur d'initialisation (IV) aléatoire à chaque chiffrement, format versionné (`v1:<iv>:<données>`)
- Document Firestore `users/{uid}/meta/keys` : `{ wrappedKey, salt, iterations, version }`
**Critères d'acceptation**
- [x] Chiffrer puis déchiffrer redonne la valeur d'origine
- [x] Deux chiffrements de la même valeur donnent des résultats différents
- [x] Une mauvaise phrase secrète produit une erreur explicite
- [x] Le format versionné permet de changer d'algorithme plus tard
**✅ Vérification**
```bash
npm test -- --run src/core/crypto
```
 
## Bloc 1.5 — Règles Firestore + tests
**Livrables**
- `firestore.rules` : refus par défaut ; un utilisateur n'accède qu'à `users/{uid}/**` si `request.auth.uid == uid`
- Tests avec `@firebase/rules-unit-testing` dans `tests/rules/`
**Critères d'acceptation**
- [x] Un utilisateur non connecté est refusé partout
- [x] L'utilisateur A ne peut ni lire ni écrire les données de l'utilisateur B
- [x] L'utilisateur A peut lire et écrire ses propres données
**✅ Vérification**
```bash
firebase emulators:exec --only firestore "npm test -- --run tests/rules"
```
 
## Bloc 1.6 — Authentification web
**Livrables**
- Adaptateur web de `AuthService`
- Écran de connexion minimal + déconnexion
- Domaines autorisés dans Firebase Auth (`localhost`, domaine du site)
**Critères d'acceptation**
- [ ] Connexion et déconnexion fonctionnent avec l'émulateur
- [ ] La session survit au rechargement de la page
## Bloc 1.7 — Déploiement sur Firebase Hosting
**Critères d'acceptation**
- [ ] `firebase deploy --only hosting,firestore:rules` réussit
- [ ] Connexion réelle depuis l'URL `*.web.app`
- [ ] Les règles déployées sont identiques à celles du repo
**🏁 Fin du jalon 1 :** tag `v0.1.0`.
 
---
 
# Jalon 2 — Fonctionnel
 
> **Ce qui évite de s'enfermer :** aucune API navigateur dans les composants (pas de `localStorage` direct).
 
## Bloc 2.1 — Modèle de données
**Livrables**
- Schéma des collections sous `users/{uid}/...` à partir du bloc 0.2
- Types TypeScript + validation (ex. Zod) partagés entre le métier et l'adaptateur
- Champs chiffrés identifiés dans les types
- Règles Firestore et tests mis à jour
| Collection | Champs | Champs chiffrés | Index |
|---|---|---|---|
| `users/{uid}/meta/keys` | `wrappedKey`, `salt`, `iterations`, `version` | — | — |
| `users/{uid}/pesees/{YYYY-MM-DD}` | `date`, `poids`, `note`, `createdAt`, `updatedAt` | `poids`, `note` | `date` (index simple automatique) |
| `users/{uid}/meta/profil` (v1.1) | `unite`, `taille`, `objectif` | `taille`, `objectif` | — |

> Identifiant du document = date : une seule pesée par jour, pas de doublon possible.
 
**Critères d'acceptation**
- [x] Le schéma est validé par l'utilisateur
- [x] Aucun filtre ni tri ne porte sur un champ chiffré
## Bloc 2.2 — DataStore web + état de la synchro
**Livrables**
- Adaptateur web de `DataStore` : cache Firestore **en mémoire**, chiffrement et déchiffrement automatiques des champs marqués
- `syncState()` : `en ligne` / `hors ligne` / `écritures en attente`
- Indicateur de synchro visible dans l'interface
**Critères d'acceptation**
- [ ] Les composants ne voient que des données en clair, typées
- [ ] Dans la console Firebase, les champs sensibles sont illisibles
## Bloc 2.3 — Déverrouillage et gestion de la phrase secrète
**Livrables**
- Premier lancement : choix de la phrase secrète, puis génération et encapsulation de la clé
- Lancements suivants : écran de déverrouillage (clé en mémoire uniquement sur le web)
- Changement de phrase secrète : seule la clé est ré-encapsulée, sans rechiffrer les données
- Verrouillage manuel et verrouillage automatique (D12) : après **5 min** d'inactivité, délai réglable dans les paramètres
**Critères d'acceptation**
- [ ] Après rechargement de la page, la phrase secrète est redemandée
- [ ] Après un changement de phrase, les anciennes données restent lisibles
- [ ] Aucune clé ni phrase secrète dans `localStorage` ou IndexedDB (vérifier dans les DevTools)
## Bloc 2.4 — Écrans métier
| Écran / fonctionnalité | Statut |
|---|---|
| Saisie d'une pesée (date, poids, note facultative) | [ ] |
| Historique (modifier, supprimer) | [ ] |
| Graphique d'évolution (30 j / 90 j / 1 an / tout) | [ ] |
| Export CSV (sert aussi de sauvegarde) | [ ] |
 
**Critères d'acceptation**
- [ ] Chaque écran a des états chargement / vide / erreur
- [ ] Interface utilisable sur un écran de téléphone (360 px de large)
## Bloc 2.5 — Tests hors ligne et conflits (navigateur)
| Scénario | Résultat attendu | OK |
|---|---|---|
| DevTools → Offline, puis création et modification | Écritures en attente, interface à jour | [ ] |
| Retour en ligne | Synchro automatique, indicateur à jour | [ ] |
| Deux onglets modifient le même document | Règle de conflit appliquée (D6 : dernière écriture gagnante) | [ ] |
| Session expirée pendant le hors ligne | Reconnexion demandée sans perte des écritures en attente | [ ] |
 
> ℹ️ Sur le web, le cache est en mémoire : le hors ligne fonctionne tant que l'onglet reste ouvert. C'est voulu.
 
**🏁 Fin du jalon 2 :** tag `v0.2.0`.
 
---
 
# Jalon 3 — APK
 
> **Ce qui évite de s'enfermer :** la config Vite est compatible Capacitor depuis l'étape 1 (`base: './'`, build statique).
> **Prérequis :** blocs 3.x de `plan-installation-outils.md` terminés.
 
## Bloc 3.1 — Ajout de Capacitor Android
**Livrables**
- `capacitor.config.ts` (`appId` = identifiant du bloc 0.2, `webDir: 'dist'`)
- Dossier `android/` généré et versionné
- Script npm `android` : `build` + `cap sync` + `cap run android`
**✅ Vérification**
```bash
npx cap doctor && npm run android
```
 
## Bloc 3.2 — Configuration Firebase Android (SHA-1)
**Livrables**
- Appli Android ajoutée dans le projet Firebase (même identifiant de package)
- Empreintes **SHA-1 du keystore de debug** (puis de release au bloc 4.1) déclarées dans Firebase
- `google-services.json` placé dans `android/app/`, **ignoré par Git**
**✅ Vérification**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
git check-ignore android/app/google-services.json && echo "OK : ignoré"
```
 
## Bloc 3.3 — Adaptateurs natifs
**Livrables**
- `KeyStore` natif : stockage sécurisé dans l'Android Keystore (D13 : phrase secrète saisie une fois par appareil, puis clé conservée dans le Keystore et déverrouillée par **empreinte à l'ouverture** de l'appli ; pas de re-verrouillage en cours d'utilisation)
- `AuthService` natif : `@capacitor-firebase/authentication`
- `DataStore` natif : `@capacitor-firebase/firestore` (cache natif hors ligne)
- Réseau : `@capacitor/network` alimente `syncState()`
- `platform.ts` choisit web ou natif via `Capacitor.isNativePlatform()`
**Critères d'acceptation**
- [ ] **Aucun changement** dans `core/` ni dans `features/`
- [ ] Les tests unitaires du jalon 1 passent toujours
## Bloc 3.4 — Icônes, écran de démarrage, nom de l'appli
**Livrables**
- Icône et écran de démarrage générés avec `@capacitor/assets`
- Nom affiché et couleur de thème
## Bloc 3.5 — Tests sur téléphone
| Scénario | Résultat attendu | OK |
|---|---|---|
| Mode avion, création et modification, fermeture complète de l'appli, réouverture | Données présentes (cache natif) | [ ] |
| Sortie du mode avion | Synchro automatique | [ ] |
| Modification sur le web pendant que le téléphone est hors ligne, puis reconnexion | Conflit résolu selon la règle choisie | [ ] |
| Désinstallation puis réinstallation | Connexion + phrase secrète → données récupérées | [ ] |
| Débogage via `chrome://inspect` | Aucune erreur dans la console | [ ] |
 
**🏁 Fin du jalon 3 :** tag `v0.3.0` (APK de debug).
 
---
 
# Jalon 4 — Distribution
 
> **Ce qui évite de s'enfermer :** keystore dans les Secrets, rien de sensible dans le repo public.
 
## Bloc 4.1 — Signature de release
**Livrables**
- Keystore de release créé et sauvegardé (bloc 4.1 de `plan-installation-outils.md`)
- `android/app/build.gradle` : lit la signature depuis des variables d'environnement, et lit `versionCode` / `versionName` depuis la CI
- SHA-1 de release ajoutée dans Firebase
- Secrets GitHub : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_SERVICES_JSON_BASE64`, `FIREBASE_SERVICE_ACCOUNT`
**Critères d'acceptation**
- [ ] `./gradlew assembleRelease` fonctionne en local avec les variables d'environnement
- [ ] La connexion Google fonctionne avec l'APK de release
## Bloc 4.2 — CI sur les pull requests (`ci.yml`)
- Lint, tests unitaires, tests des règles (émulateur), build web
- Build APK de debug (vérifie que le projet Android compile)
**Critères d'acceptation**
- [ ] Une pull request qui casse un test est bloquée
## Bloc 4.3 — Workflow de release (`release.yml`)
Déclenché sur un tag `v*` :
1. Tests
2. Build web, puis déploiement Hosting et règles Firestore
3. Calcul de `versionCode` à partir du tag
4. Injection de `google-services.json` et du keystore depuis les Secrets
5. Build de l'APK signé, puis GitHub Release avec l'APK et les notes de version
6. Nettoyage des fichiers sensibles du runner
**Critères d'acceptation**
- [ ] Les logs de la CI n'affichent aucun secret
- [ ] Le nom de l'APK contient la version
## Bloc 4.4 — Première release + Obtainium
- Tag `v1.0.0`
- Obtainium configuré sur le repo
- Test de mise à jour : tag `v1.0.1`, puis vérifier qu'Obtainium propose la mise à jour et que les données sont conservées
**🏁 Fin du jalon 4 :** `v1.0.0` publiée.
 
---
 
# Jalon 5 — Maintenance (continu)
 
- [ ] Dependabot ou Renovate activé (npm + Gradle + GitHub Actions)
- [ ] Revue mensuelle des quotas Firebase (console → Utilisation)
- [ ] Sauvegarde : export manuel périodique des données (script client qui déchiffre localement), car l'export Firestore géré exige le plan Blaze
- [ ] Sauvegarde vérifiée du keystore de release et de la phrase secrète
- [ ] Si passage en plan Blaze : alerte de budget configurée
---
 
## 🗂️ Registre des décisions
 
| # | Date | Décision | Raison | Alternatives écartées |
|---|---|---|---|---|
| D1 | | Capacitor plutôt que Flutter ou natif | Un seul code web + APK, effort modéré | Flutter, Kotlin |
| D2 | | Firebase (Spark) | Gratuit, synchro + hors ligne intégrés, pas de mise en pause pour inactivité | Supabase |
| D3 | | Clé de données encapsulée par PBKDF2 | Accès web + Android, récupération après réinstallation | Clé uniquement dans le Keystore |
| D4 | | Cache web en mémoire | Pas de données persistées dans le navigateur | Cache IndexedDB |
| D5 | | Distribution par GitHub Releases + Obtainium | Gratuit, pas de Play Store | Play Store (25 $) |
| D6 | 2026-10-24 | Conflits : dernière écriture gagnante, au niveau du document du jour | Un document par jour, usage mono-utilisateur (#3) | Fusion champ par champ, résolution manuelle |
| D7 | 2026-10-24 | Configs dans `config/`, règles et index Firestore dans `firebase/` | Racine lisible | Tout à la racine (arborescence cible) |
| D8 | 2026-10-24 | Dev contre un projet `demo-suivi-poids` | Le SDK ne parle qu'aux émulateurs : la prod est inaccessible par construction | Projet réel dès le 1.2 |
| D9 | 2026-10-24 | VS Code reste en Flatpak (Java 21 via extension SDK, `gh` dans `~/.local/bin`) | Choix de l'utilisateur (#1) | VS Code natif (AUR) |
| D10 | 2026-10-24 | ESLint (pas oxlint) | Règle d'or appliquée par des règles par dossier, outil mûr ; la vitesse est sans enjeu ici (#4) | oxlint (défaut Vite 8) |
| D11 | 2026-10-24 | Node en version LTS uniquement (24, puis 26 dès son passage LTS) | Correctifs de sécurité sur la durée (#4) | Version Current |
| D12 | 2026-10-24 | Verrouillage auto web : 5 min d'inactivité, réglable ; bouton manuel | Protège un poste laissé ouvert, coût faible pour une appli de saisie rapide (#12, #2) | Délai fixe ; règle onglet caché séparée |
| D13 | 2026-10-24 | Phrase secrète saisie une fois par appareil ; Android : clé dans le Keystore, déverrouillée par empreinte à l'ouverture, sans re-verrouillage en cours d'utilisation ; web : phrase à chaque session | Simple au quotidien sans perte de sécurité ; réversible sans toucher aux données (#13, #2) | Pas de chiffrement ; phrase à chaque ouverture ; re-verrouillage auto sur Android |
| D14 | 2026-10-24 | `main` protégée par un ruleset : PR obligatoire, check `verify` requis, ni force-push ni suppression | `main` toujours déployable (#8) | Push direct |
| D15 | 2026-10-24 | Connexion Google uniquement (comptes fictifs de l'émulateur Auth en dev) | Aucun mot de passe en plus de la phrase secrète (#2) | E-mail + mot de passe |
| D16 | 2026-10-24 | Date en clair (et identifiant du document), poids et note chiffrés | Tri et filtre par période côté Firestore ; la date seule révèle peu (#2) | Tout chiffrer (tri côté client) |
| D18 | 2026-10-24 | Vrai projet `machimoto` utilisé par le build de production uniquement ; dev et tests restent sur `demo-suivi-poids` | Garde D8 : `npm run dev` ne peut pas toucher les vraies données | Variables d'environnement `.env` (inutiles : la config est publique) |
 
## ⚠️ Risques
 
| Risque | Impact | Parade |
|---|---|---|
| Perte de la phrase secrète | Données chiffrées perdues | Gestionnaire de mots de passe ; avertissement clair à la création |
| Perte du keystore de release | Plus de mise à jour possible | Double sauvegarde hors de la machine |
| Fuite d'un secret dans le repo public | Compromission | `.gitignore`, revue avant commit, secret scanning de GitHub activé |
| Règles Firestore trop permissives | Fuite de données | Tests de règles obligatoires dans la CI |
| Boucle de lectures Firestore | Quota épuisé | Rester en Spark, écouter les changements plutôt que relire en boucle |
 
## ❓ Questions ouvertes
 
| # | Question | Réponse |
|---|---|---|
| Q1 | | |
 
## 📝 Journal
 
| Date | Bloc | Note (ce qui a été fait, problème rencontré, solution) |
|---|---|---|
| 2026-10-24 | 0.1 | Env : VS Code Flatpak conservé ; Java 21 absent → extension SDK `openjdk21` ; `gh` en binaire dans `~/.local/bin`, authentifié (#1). |
| 2026-10-24 | 1.1→1.5 | Squelette généré et fusionné (PR #6), un commit par bloc. Vérifs OK en local et en CI. `main` protégée (#8). |
| 2026-10-24 | 1.2 | Critères OK sur émulateurs ; le projet Firebase réel et la méthode d'auth attendent le cadrage 0.2 (#2) et le bloc 1.7 (#5). |
| 2026-10-24 | 4.2 | `ci.yml` anticipé et requis sur `main`. Reste : build APK de debug (jalon 3). |
| 2026-10-24 | 0.2 / 2.1 | Cadrage fait : **Professeur Machimoto** (`io.github.azaameth.machimoto`), pesées chiffrées (poids, note), connexion Google. Schéma 2.1 validé. D6, D12, D13 précisées ; D15, D16 ajoutées (#2). |
| 2026-10-24 | 1.2 | Projet Firebase `machimoto` créé (Spark, Auth Google, Firestore europe-west1). Config branchée sur le build de prod (D18) ; `.firebaserc` : `default` = machimoto, alias `demo` (#5). |
