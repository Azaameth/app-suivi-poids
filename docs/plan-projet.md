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
| Front | Vite + React + TypeScript, Zod |
| Backend | Firebase, plan Spark (Auth + Firestore) |
| Chiffrement | AES-GCM sur les champs sensibles ; clé de données encapsulée par une clé dérivée de la phrase secrète (PBKDF2) et par un code de secours (D48) |
| Architecture | 5 interfaces : `AuthService`, `KeyStore`, `DataStore`, `PreferencesStore` (D26), `FileExporter` (D27). Une version web et une version native (adaptateurs) |
| Cache local | Web : IndexedDB (données chiffrées) si « Garder mes données sur cet appareil », sinon mémoire (D49). Android : cache natif Firestore |
| Mobile | Capacitor (Android) + plugins `@capacitor-firebase/*`, stockage sécurisé dans le Keystore |
| Hébergement web | Firebase Hosting |
| CI/CD | GitHub Actions (repo public) |
| Distribution | GitHub Releases + Obtainium |
 
---
 
## 📍 Suivi
 
| Bloc | Jalon | Contenu | Fait |
|---|---|---|---|
| 0.1 | Prérequis | Environnement installé (plan d'installation, jalons 1 et 2) | [x] |
| 0.2 | Prérequis | Cadrage fonctionnel minimal | [x] |
| 1.1 | Socle web | Initialisation du repo et de l'outillage | [x] |
| 1.2 | Socle web | Projet Firebase + émulateurs | [x] |
| 1.3 | Socle web | Interfaces et sélection des adaptateurs | [x] |
| 1.4 | Socle web | Module de chiffrement | [x] |
| 1.5 | Socle web | Règles Firestore + tests | [x] |
| 1.6 | Socle web | Authentification web | [x] |
| 1.7 | Socle web | Déploiement sur Firebase Hosting | [x] |
| 2.1 | Fonctionnel | Modèle de données | [x] |
| 2.2 | Fonctionnel | DataStore web + état de la synchro | [x] |
| 2.3 | Fonctionnel | Déverrouillage et gestion de la phrase secrète | [x] |
| 2.4 | Fonctionnel | Écrans métier | [x] |
| 2.5 | Fonctionnel | Tests hors ligne et conflits (navigateur) | [x] |
| 2.6 | Fonctionnel | Tableau de bord : tendance, rythme, projection (`docs/spec-restitution.md`, v1) | [x] |
| 2.7 | Fonctionnel | Finitions ergonomiques : icônes de l'historique, barre de navigation, notes sur le graphique, thème clair / sombre | [x] |
| 2.8 | Fonctionnel | Ouverture aux proches : suggestions dans l'appli, version visible, installation (manifeste web), suppression du compte | [x] |
| 2.9 | Fonctionnel | Code de secours (phrase oubliée) | [x] |
| 2.10 | Fonctionnel | Machimoto dans les parcours : expressions, accueil, départ, écrans sans graphique | [x] |
| 2.11 | Fonctionnel | Démarrage hors ligne : copie locale chiffrée (option « Garder mes données sur cet appareil ») | [x] |
| 2.12 | Fonctionnel | Import CSV (reprise de pesées existantes, #39) | [x] |
| 2.13 | Fonctionnel | Connexion par e-mail et mot de passe (en plus de Google) | [x] |
| 2.14 | Fonctionnel | Appli disponible hors ligne (service worker), nouvelles versions proposées | [x] |
| 3.1 | APK | Ajout de Capacitor Android | [ ] |
| 3.2 | APK | Configuration Firebase Android (SHA-1) | [ ] |
| 3.3 | APK | Adaptateurs natifs | [ ] |
| 3.4 | APK | Icônes, écran de démarrage, nom de l'appli | [ ] |
| 3.5 | APK | Tests sur téléphone | [ ] |
| 4.1 | Distribution | Signature de release | [ ] |
| 4.2 | Distribution | CI sur les pull requests | [ ] |
| 4.3 | Distribution | Workflow de release (tag → APK + Hosting) | [ ] |
| 4.4 | Distribution | Première release + Obtainium | [ ] |
| 4.5 | Distribution | Vérification développeur Android (installation sans avertissement « développeur non vérifié ») | [ ] |
| 5.1 | Maintenance | Dépendances, sauvegardes, surveillance | [ ] |
| 6.1 | v1.1 | Profil (usage, cible, tolérance, **taille**), objectif, couleurs liées à l'usage, **repères d'IMC** (`docs/spec-restitution.md`, v1.1 ; D46) | [ ] |
 
---
 
## 🧭 Conventions
 
**Branches :** `main` toujours déployable. Le travail se fait sur `feat/<bloc>-<sujet>` (ex. `feat/1.4-crypto`), puis passe par une pull request vers `main`.
 
**Commits :** [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`.
 
**Versions :** tags `vMAJEUR.MINEUR.CORRECTIF`. Le `versionCode` Android se calcule à partir du tag (`v1.2.3` → `10203`).
 
**Arborescence** (réelle, mise à jour le 2026-10-25 ; configs regroupées, D7) :
```
app-suivi-poids/
├── .claude/                  # outillage de Claude Code : hooks, skills (voir CLAUDE.md § 6)
├── .github/                  # workflows/ci.yml (release.yml au jalon 4), dependabot.yml, modèle de PR
├── .githooks/                # pre-commit : check-secrets
├── android/                  # généré par Capacitor (jalon 3)
├── config/                   # ESLint, Prettier, Vite/Vitest, tsconfig
├── docs/                     # plan-projet.md, plan-installation-outils.md, spec-restitution.md
├── firebase/                 # firestore.rules, firestore.indexes.json, firebase.tests.json
├── public/                   # favicon, icônes, manifeste web
├── scripts/                  # check-secrets.mjs, plan.mjs (mise à jour du plan), empreinte.mjs
├── src/
│   ├── core/                 # interfaces + logique métier (aucune API de plateforme)
│   │   ├── auth/ data/ keys/ prefs/ files/   # les 5 interfaces de Services
│   │   ├── crypto/           # AES-GCM, PBKDF2, encapsulation de la clé
│   │   ├── vault/            # coffre : phrase secrète, déverrouillage
│   │   ├── pesees/           # modèle, chiffrement des champs, dépôt, périodes, export et import CSV
│   │   ├── analyse/          # tendance, rythme, variation, projection, plausibilité
│   │   ├── suggestions/      # suggestions des proches (D45)
│   │   └── compte/           # suppression du compte (D47)
│   ├── adapters/
│   │   ├── web/              # Firebase JS SDK, localStorage (préférences), téléchargement
│   │   ├── memory/           # implémentations en mémoire (tests)
│   │   └── native/           # versions Capacitor (jalon 3)
│   ├── context/              # contexte React des services
│   ├── features/             # écrans : auth, vault, tableau-de-bord, pesees, prefs, shell, suggestions, compte, sync, dev, commun
│   ├── assets/               # Professeur Machimoto (SVG, 4 expressions)
│   ├── test/                 # appHarness : parcours communs des tests d'interface
│   ├── platform.ts           # choix des adaptateurs selon la plateforme
│   └── main.tsx
├── tests/emulateurs/         # règles, stockage, hors ligne, session (npm run test:emulateurs)
├── firebase.json
├── capacitor.config.ts       # jalon 3
├── README.md, CONTRIBUTING.md, SECURITY.md, CLAUDE.md, LICENSE
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
| Utilisateurs / partage | ~~Un seul utilisateur~~ → **quelques proches**, comptes indépendants (inscription ouverte), **aucun partage** — révisé le 2026-10-25 (D44) |
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
- Tests avec `@firebase/rules-unit-testing` dans `tests/emulateurs/`
**Critères d'acceptation**
- [x] Un utilisateur non connecté est refusé partout
- [x] L'utilisateur A ne peut ni lire ni écrire les données de l'utilisateur B
- [x] L'utilisateur A peut lire et écrire ses propres données
**✅ Vérification**
```bash
npm run test:emulateurs
```
 
## Bloc 1.6 — Authentification web
**Livrables**
- Adaptateur web de `AuthService`
- Écran de connexion minimal + déconnexion
- Domaines autorisés dans Firebase Auth (`localhost`, domaine du site)
**Critères d'acceptation**
- [x] Connexion et déconnexion fonctionnent avec l'émulateur
- [x] La session survit au rechargement de la page
## Bloc 1.7 — Déploiement sur Firebase Hosting
**Critères d'acceptation**
- [x] `firebase deploy --only hosting,firestore:rules` réussit
- [x] Connexion réelle depuis l'URL `*.web.app`
- [x] Les règles déployées sont identiques à celles du repo
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
- [x] Les composants ne voient que des données en clair, typées
- [x] Dans la console Firebase, les champs sensibles sont illisibles
## Bloc 2.3 — Déverrouillage et gestion de la phrase secrète
**Livrables**
- Premier lancement : choix de la phrase secrète, puis génération et encapsulation de la clé
- Lancements suivants : écran de déverrouillage (clé en mémoire uniquement sur le web)
- Changement de phrase secrète : seule la clé est ré-encapsulée, sans rechiffrer les données
- Verrouillage manuel et verrouillage automatique (D12) : après **5 min** d'inactivité, délai réglable dans les paramètres
**Critères d'acceptation**
- [x] Après rechargement de la page, la phrase secrète est redemandée
- [x] Après un changement de phrase, les anciennes données restent lisibles
- [x] Aucune clé ni phrase secrète dans `localStorage` ou IndexedDB (vérifier dans les DevTools)
## Bloc 2.4 — Écrans métier
| Écran / fonctionnalité | Statut |
|---|---|
| Saisie d'une pesée (date, poids, note facultative) | [x] |
| Historique (modifier, supprimer) | [x] |
| Graphique d'évolution (30 j / 90 j / 1 an / tout) | [x] |
| Export CSV (sert aussi de sauvegarde) | [x] |
 
**Critères d'acceptation**
- [x] Chaque écran a des états chargement / vide / erreur
- [x] Interface utilisable sur un écran de téléphone (360 px de large)
## Bloc 2.5 — Tests hors ligne et conflits (navigateur)
| Scénario | Résultat attendu | OK |
|---|---|---|
| DevTools → Offline, puis création et modification | Écritures en attente, interface à jour | [x] |
| Retour en ligne | Synchro automatique, indicateur à jour | [x] |
| Deux onglets modifient le même document | Règle de conflit appliquée (D6 : dernière écriture gagnante) | [x] |
| Session expirée pendant le hors ligne | Reconnexion demandée sans perte des écritures en attente | [x] |

> ✅ Les 4 scénarios sont automatisés sous émulateur (`tests/emulateurs/hors-ligne.test.ts`, `session.test.ts`) avec le vrai SDK coupé du réseau (`disableNetwork`). Vérification manuelle dans le navigateur : checklist de la PR du bloc 2.5.
 
> ℹ️ Sur le web, le cache est en mémoire : le hors ligne fonctionne tant que l'onglet reste ouvert. C'est voulu. *(Révisé par le bloc 2.11 : copie locale chiffrée, D49.)*
 
## Bloc 2.6 — Tableau de bord (restitution v1)
**Référence :** `docs/spec-restitution.md` (sections 3, 4.1 à 4.4, 5 sans objectif) et ses arbitrages du 25/10/2026.
**Livrables**
- `src/core/analyse/` : constantes, dates, tendance (moyenne mobile exponentielle), rythme (régression 28 j), variation 30 j, projection 4 semaines avec fourchette — fonctions pures
- Onglet « Tableau de bord » : 4 tuiles (tendance, rythme, sur 30 jours, projection), graphique en ligne (pesées discrètes, tendance, projection en pointillés + cône), pesée du jour
**Critères d'acceptation**
- [x] Cas de test obligatoires de la spec (§ 7, partie v1) couverts
- [x] États chargement / vide / erreur ; tuiles lisibles à 360 px
- [x] Couleurs neutres ; le signe et le texte portent l'information

## Bloc 2.7 — Finitions ergonomiques (demandées le 2026-10-25, après #32)
**Objectif :** affiner l'ergonomie à l'usage, sans toucher au métier.

**Livrables**
1. **Historique et barre de navigation**
   - Boutons de ligne en **icônes** : ✏️ stylo « Modifier » ; 🗑️ poubelle **sur fond rouge** « Supprimer ». Chaque icône a un nom accessible et une info-bulle. La confirmation en deux temps est conservée (« Confirmer la suppression »).
   - Grand écran : **espace** entre le bandeau du haut et la barre de navigation.
   - Le contenu **ne défile plus visiblement sous les barres** : bandeau et navigation forment une seule zone collante, opaque, sur toute la largeur. Sur mobile, la barre du bas est déjà opaque ; on vérifie qu'aucun contenu n'apparaît derrière.
2. **Notes sur le graphique**
   - Une pesée avec une note est dessinée comme un **point mis en évidence** : couleur `--highlight`, un peu plus gros.
   - **Au survol, info-bulle** avec la date, le poids et la note.
   - `--highlight` est un **jeton de couleur** (pas un jaune en dur), défini pour chaque thème avec la **même intensité perçue** sur fond clair et sur fond sombre (contraste ≥ 3:1 avec le fond du graphique).
   - Légende : « ● pesée avec note ».
3. **Thème clair / sombre**
   - Réglages → **Thème : Système · Clair · Sombre** (« Système » par défaut : suit le réglage du téléphone ou de l'ordinateur).
   - Préférence enregistrée dans le `PreferencesStore` (propre à l'appareil), appliquée **instantanément** via `data-theme` sur `<html>`, sans rechargement.
   - Toutes les couleurs passent par les jetons CSS (`--bg`, `--fg`, `--accent`, `--highlight`…), redéfinis par thème. `theme-color` (barre du navigateur mobile) suit le thème.

**Décisions (validées avec la PR #32)**
- D41 : thème à trois choix (Système / Clair / Sombre), « Système » par défaut, par appareil.
- D42 : mise en évidence des notes par un jeton `--highlight` par thème, d'intensité équivalente ; info-bulle native (`<title>` SVG) pour commencer.

**Critères d'acceptation**
- [x] Modifier / Supprimer reconnaissables sans texte, utilisables au clavier et au lecteur d'écran
- [x] Aucun contenu visible entre ou sous les barres en défilant (mobile et grand écran)
- [x] Les pesées avec note se repèrent sur le graphique, la note s'affiche au survol
- [x] Le thème change instantanément, persiste au rechargement, et « Système » suit le réglage de l'appareil
- [x] Contrastes lisibles dans les deux thèmes (texte ≥ 4,5:1, éléments graphiques ≥ 3:1) — `--highlight` : 4,55:1 (clair) et 5,09:1 (sombre) ; blanc sur rouge ≥ 5:1

## Bloc 2.8 — Ouverture aux proches (décidé le 2026-10-25)
**Objectif :** faire vivre l'appli auprès de quelques proches pour recueillir leurs suggestions, avant l'APK. La version web suffit (Android **et** iPhone).

**Livrables**
1. **Suggestions dans l'appli** (D45)
   - Bouton **🗨️ dans le bandeau**, à gauche de l'avatar (choix d'Azaameth) → **« Suggérer une idée »** : fenêtre avec un texte (10 à 2 000 caractères) et un type (idée / problème).
   - Stockage `users/{uid}/suggestions/{id}` : `{ type, texte, version, createdAt }`. **Non chiffré** (pour que Maxime puisse le lire) : l'écran prévient de ne pas y mettre d'information de santé.
   - Règles : le propriétaire crée, relit et supprime ses suggestions ; forme et tailles validées ; tests sous émulateur.
   - Lecture par Maxime dans la console Firebase ; un script pourra ensuite les transformer en issues GitHub.
2. **Version visible** : numéro de version (`package.json`) affiché dans le menu du profil et joint à chaque suggestion.
3. **Installation sur l'écran d'accueil** : manifeste web (`manifest.webmanifest` : nom, icônes PNG 192 / 512 + icône Apple 180, couleurs, `display: standalone`). Pas de service worker : le cache reste en mémoire (D4).
4. **Accueil des nouveaux** : rappel renforcé à la création de la phrase secrète (« perte = données perdues »), conseil d'export CSV régulier dans les Réglages.
5. **Supprimer mon compte et mes données** (Réglages, D47) : confirmation forte (saisie de « SUPPRIMER »), puis effacement des pesées, des suggestions, de `meta/keys`, et du compte Firebase Auth (reconnexion Google demandée si la session est ancienne).

**Décisions (validées avec la PR #33)**
- D44 : appli ouverte aux proches, inscription libre par Google ; comptes indépendants et cloisonnés, aucun partage. Quotas Spark (50 000 lectures et 20 000 écritures par jour) très au-dessus de l'usage prévu.
- D45 : suggestions stockées sous `users/{uid}/suggestions`, non chiffrées, avec avertissement ; création, lecture et suppression par leur auteur seulement.
- D46 : minimisation des données — le profil v1.1 ne demandera que la **taille** (IMC adulte : mêmes seuils pour tous) ; sexe et âge seulement si une fonctionnalité les exige un jour (métabolisme de base, masse grasse), facultatifs et chiffrés.
- D47 : `meta/keys` devient supprimable par son propriétaire, **uniquement** via le parcours « Supprimer mon compte » (confirmation forte) ; révise D25 (suppression interdite) pour permettre l'effacement complet.

**Critères d'acceptation**
- [x] Une suggestion envoyée apparaît dans la console (émulateur ; prod après déploiement), avec la version ; refusée si vide, trop longue ou pour un autre compte
- [x] La version s'affiche dans le menu
- [ ] « Ajouter à l'écran d'accueil » installe l'appli avec son icône (Android et iPhone) — à vérifier sur téléphone après déploiement
- [x] La suppression du compte efface toutes les données Firestore de l'utilisateur et son compte Auth (test sous émulateur)
- [x] Les données d'un proche restent illisibles et inaccessibles pour les autres (tests de règles existants)

## Bloc 2.9 — Code de secours (décidé le 2026-10-25)
**Objectif :** un garde-fou en cas de phrase secrète oubliée, sans casser le chiffrement « zéro connaissance ».

**Livrables**
- Code de secours aléatoire (160 bits, base32 Crockford, 8 groupes de 4), affiché **une seule fois** à la création du coffre (téléchargeable en .txt, confirmation « rangé en lieu sûr »).
- `meta/keys.secours` : la même clé de données encapsulée par le code (PBKDF2, 600 000 itérations) ; règles et tests.
- « J'ai oublié ma phrase » (coffre verrouillé) : code + nouvelle phrase ; les données restent intactes, le code reste valable.
- Réglages → Code de secours : état, création (comptes antérieurs) ou régénération, phrase actuelle exigée ; l'ancien code devient inutilisable.
- Changer de phrase conserve le code.

**Critères d'acceptation**
- [x] Récupération par le code : nouvelle phrase, pesées lisibles (tests unitaires et sous émulateur)
- [x] Mauvais code refusé ; compte sans code : message clair, création possible
- [x] Le code n'est jamais stocké (seule son encapsulation l'est)

## Bloc 2.10 — Machimoto dans les parcours (demandé le 2026-10-25)
**Objectif :** donner vie à la mascotte aux moments clés, sans alourdir les écrans de données.

**Livrables**
- **Expressions** (variantes SVG du même dessin) : content (défaut), ravi (étapes réussies), pensif (attente, chargement), triste (départ, erreur).
- **Accueil (onboarding)** : connexion → création de la phrase → code de secours, avec Machimoto qui guide (bulle de texte courte à chaque étape) ; ton chaleureux, sans jargon.
- **Départ (offboarding)** : « Supprimer mon compte » et déconnexion avec Machimoto triste (« À bientôt ? »), rappel d'exporter ses données avant suppression.
- **Écrans sans graphique** : historique vide, période sans assez de pesées, chargement, erreurs (hors ligne, coffre), fenêtre des suggestions.
- **Onglet du navigateur** : favicon Machimoto (fait au bloc mascotte, #36).

**Critères d'acceptation**
- [x] Une expression par situation, jamais culpabilisante (D33)
- [x] Images décoratives (`alt=""`), le texte porte l'information ; lisibles en thème clair et sombre
- [x] Aucun Machimoto sur le tableau de bord rempli (le graphique reste le héros)

## Bloc 2.11 — Démarrage hors ligne (décidé le 2026-10-25)
**Objectif :** ouvrir l'appli et saisir sans réseau, ou quand le serveur est injoignable alors que le navigateur se croit en ligne, sans affaiblir le chiffrement (révise D4, D49).

**Livrables**
- Cache Firestore **persistant** (IndexedDB, plusieurs onglets) quand l'option est active : il ne contient que ce que voit le serveur (pesées chiffrées, dates, clé encapsulée) ; la clé de données et la phrase restent en mémoire.
- Réglages → « Garder mes données sur cet appareil (hors ligne) », **activé par défaut** ; pris en compte au chargement suivant (bouton « Recharger maintenant »). Désactivée : cache mémoire seul et copie existante effacée.
- Copie locale **effacée** à la déconnexion et à la suppression du compte.
- Sans réseau, la lecture du coffre et des pesées retombe sur la copie locale : déverrouillage avec la phrase, saisies en attente envoyées au retour du réseau (même au rechargement de la page).

**Critères d'acceptation**
- [x] Option activée par défaut, modifiable dans les Réglages (tests UI)
- [x] Déconnexion et suppression du compte effacent la copie locale
- [x] Aucune donnée en clair ni clé de données dans IndexedDB (seuls les documents du serveur y sont)

## Bloc 2.12 — Import CSV (demandé le 2026-10-25, #39)
**Objectif :** reprendre des pesées existantes (autre appli, tableur, export de l'appli) dans son compte.

**Livrables**
- Réglages → Import CSV : date (`2026-10-25` ou `25/10/2026`), poids en kg (virgule ou point), note facultative ; séparateur `;`, tabulation ou `,` détecté ; l'export (D28) se réimporte tel quel.
- Aperçu avant écriture : nouvelles, identiques, différentes (remplacement sur demande), doublons du fichier, lignes ignorées avec leur numéro, saisies improbables (D35).
- Chaque pesée est chiffrée comme une saisie (`PeseeRepository.save`) ; fonctionne hors ligne.

**Critères d'acceptation**
- [x] Lecture testée : export de l'appli, format français, tabulation, virgule décimale non protégée, lignes illisibles
- [x] Rien n'est écrit avant confirmation ; une pesée existante n'est remplacée que sur demande
- [x] Pesées importées stockées chiffrées (test UI)

## Bloc 2.13 — Connexion par e-mail (demandé le 2026-10-25)
**Objectif :** permettre aux proches sans compte Google d'utiliser l'appli (révise D15, D53).

**Livrables**
- Écran de connexion : « Se connecter avec Google » ou « Utiliser un e-mail » (se connecter, créer un compte, mot de passe oublié).
- `AuthService` : `Credentials` e-mail, `reinitialiserMotDePasse`, `confirmerMotDePasse` ; `AuthUser.fournisseur`.
- Mot de passe (connexion, ≥ 8 caractères) bien distinct de la phrase secrète (chiffrement) : expliqué à la création.
- Suppression d'un compte e-mail : mot de passe vérifié **avant** tout effacement.
- Fournisseur « Adresse e-mail/Mot de passe » activé dans la console Firebase (fait par Azaameth).

**Critères d'acceptation**
- [x] Création, connexion, mauvais mot de passe refusé, réinitialisation à message neutre (tests UI)
- [x] Codes d'erreur réels de Firebase Auth traduits (test sous émulateur)
- [x] Suppression : mauvais mot de passe → rien n'est effacé

## Bloc 2.14 — Appli disponible hors ligne (décidé le 2026-10-25)
**Objectif :** ouvrir l'appli **à froid** sans réseau. Le bloc 2.11 rendait les données disponibles hors ligne, mais pas l'appli elle-même : sans service worker, le navigateur doit retélécharger `index.html` à chaque ouverture (D54).

**Livrables**
- `vite-plugin-pwa` (Workbox, `generateSW`) : copie locale de l'appli (HTML, JS, CSS, icônes, manifeste), **aucune donnée** ; pages `/__/` (connexion Firebase) exclues.
- Nouvelle version **proposée** (« Mettre à jour » / « Plus tard »), jamais imposée : recharger reverrouille le coffre. Vérification au démarrage puis toutes les heures ; sans action, installation à la prochaine ouverture.
- `sw.js` servi sans cache (`firebase.json`) ; contrôlé par `verifier-prod`.
- Enregistrement dans `src/adapters/web/miseAJour.ts`, exposé aux écrans par `MiseAJourContext` (aucune mise à jour proposée en test ni, plus tard, dans l'APK).

**Critères d'acceptation**
- [x] Précache complet (écrans chargés à la demande compris), sans Firestore ni pages `/__/`
- [x] Bandeau de mise à jour testé (appliquer, plus tard)
- [ ] En prod : ouverture à froid en mode avion, déverrouillage, saisie en attente (issue de suivi)

**🏁 Fin du jalon 2 :** tag `v0.2.0` ; après 2.7 et 2.8 : tag `v0.2.1` (web ouvert aux proches).
 
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
## Bloc 4.5 — Vérification développeur Android (ajouté le 2026-10-25)
**Contexte :** depuis le 30/09/2026 (Brésil, Indonésie, Singapour, Thaïlande), puis partout à partir de 2027, les appareils Android certifiés n'installent sans détour que les applis de **développeurs vérifiés**, Play Store ou non. Sinon : ADB, ou le « parcours avancé » (option développeur, attente de 24 h, redémarrage), dissuasif pour les proches.

**Livrables**
- Compte **Android Developer Console** à **distribution limitée** (gratuit, sans pièce d'identité, jusqu'à 20 appareils) : suffisant pour Maxime et ses proches. Le passer en compte vérifié complet seulement si l'usage dépasse 20 appareils.
- Enregistrement du package `io.github.azaameth.machimoto` avec la **clé de signature de release** (bloc 4.1) : même clé pour toute la vie de l'appli.
- Procédure d'ajout d'un appareil de proche, documentée dans `CONTRIBUTING.md`.

**Critères d'acceptation**
- [ ] APK de release installé sur le Pixel 7 Pro via Obtainium sans avertissement « développeur non vérifié »
- [ ] Mise à jour (`v1.0.1`) installée sans avertissement
- [ ] Un appareil de proche ajouté et installé

**Dépendances :** bloc 4.1 (clé de release). Inscription du compte : geste de Maxime (identité Google), suivi dans une issue `pour-maxime`.

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
| D1 | 2026-10-23 | Capacitor plutôt que Flutter ou natif | Un seul code web + APK, effort modéré | Flutter, Kotlin |
| D2 | 2026-10-23 | Firebase (Spark) | Gratuit, synchro + hors ligne intégrés, pas de mise en pause pour inactivité | Supabase |
| D3 | 2026-10-23 | Clé de données encapsulée par PBKDF2 | Accès web + Android, récupération après réinstallation | Clé uniquement dans le Keystore |
| D4 | 2026-10-23 | Cache web en mémoire (révisé par D49) | Pas de données persistées dans le navigateur | Cache IndexedDB |
| D5 | 2026-10-23 | Distribution par GitHub Releases + Obtainium | Gratuit, pas de Play Store | Play Store (25 $) |
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
| D17 | 2026-10-24 | Session d'auth web : persistance par défaut du SDK (survit au rechargement) ; clé et phrase en mémoire uniquement | Critère du 1.6 ; le jeton seul ne donne pas accès aux données chiffrées (#16) | Session limitée à l'onglet |
| D18 | 2026-10-24 | Vrai projet `machimoto` utilisé par le build de production uniquement ; dev et tests restent sur `demo-suivi-poids` | Garde D8 : `npm run dev` ne peut pas toucher les vraies données | Variables d'environnement `.env` (inutiles : la config est publique) |
| D19 | 2026-10-24 | Règles Firestore en liste explicite : seuls `meta/keys` et `pesees/{date}` sont autorisés, forme validée (miroir du schéma Zod) | Défense en profondeur : une collection non prévue ou une donnée en clair est refusée côté serveur | Tout permis sous `users/{uid}` |
| D20 | 2026-10-24 | `createdAt` / `updatedAt` en millisecondes (entier), posés par le client | `core/` reste indépendant de Firebase (même code web et Android) | `Timestamp` Firestore / `serverTimestamp()` |
| D21 | 2026-10-24 | Poids en kg, de 0 à 5 000 inclus ; note de 1 à 500 caractères, absente si vide | Choix d'Azaameth (#19) ; l'unité d'affichage viendra avec le profil (v1.1) | 1 à 500 kg |
| D22 | 2026-10-24 | Chiffrement dans `core/pesees` (`PeseeRepository`), pas dans l'adaptateur ; le `DataStore` ne voit que du chiffré | Écrit une fois pour web et Android ; l'adaptateur natif (3.3) n'aura rien à chiffrer | Chiffrement dans chaque adaptateur |
| D23 | 2026-10-24 | Écritures non bloquantes : effet local immédiat, `synced` se résout à la confirmation du serveur | Hors ligne, l'interface ne reste pas figée en attendant le réseau | Attendre la confirmation du serveur |
| D24 | 2026-10-24 | Phrase secrète : 12 caractères minimum, confirmation à la création, avertissement « perte = données perdues » | Seule protection des données chiffrées ; une suite de mots est facile à retenir | Pas de minimum ; règles de complexité (majuscules, chiffres…) |
| D25 | 2026-10-24 | Création du coffre : réseau obligatoire, refus d'écraser un `meta/keys` existant ; la déconnexion verrouille | Écraser `meta/keys` ou chiffrer avec une clé non enregistrée rendrait les données illisibles | Création hors ligne |
| D26 | 2026-10-24 | 4ᵉ interface `PreferencesStore` (délai de verrouillage, réglages du graphique) ; web : `localStorage`, propre à l'appareil | Rien de secret ; la règle d'or interdit `localStorage` hors `adapters/` | Firestore `meta/prefs` (synchro entre appareils, règles à étendre) |
| D27 | 2026-10-24 | 5ᵉ interface `FileExporter` ; web : téléchargement | Sur Android, le téléchargement ne marche pas en WebView : partage natif au jalon 3 | Lien de téléchargement dans les écrans |
| D28 | 2026-10-24 | CSV RFC 4180 (virgule, point décimal), BOM UTF-8, fichier `machimoto-pesees-AAAA-MM-JJ.csv` | Réimportable tel quel (sauvegarde) ; accents corrects dans Excel | Point-virgule + virgule décimale (Excel FR) |
| D29 | 2026-10-25 | Graphique en SVG fait main, en ligne uniquement : pesées en points discrets, tendance (D30) en trait principal, projection (D31) ; réglages : période (7 j / 30 j / 90 j / 1 an / Tout), axe depuis 0 | Lisible même avec un an de pesées ; aucune dépendance. Styles points / barres et moyenne 7 j retirés (#24) | Bibliothèque de graphiques (≈ 100 Ko) ; choix du style ; moyenne 7 j |
| D30 | 2026-10-25 | Tendance = moyenne mobile exponentielle, facteur 0,1, ajustée aux jours manquants | Plus réactive et plus robuste que la moyenne sur 7 jours (#24) | Moyenne mobile 7 j |
| D31 | 2026-10-25 | Rythme = régression linéaire sur 28 jours ; projection de la tendance à 4 semaines avec fourchette (± 2 erreurs-types), masquée si moins de 14 pesées ou si le rythme est stable (< 0,1 kg/sem) | Éviter la fausse précision (#24) | Projection sans fourchette |
| D32 | 2026-10-25 | Profil v1.1 : usage (perdre / gagner / maintenir), cible chiffrée, tolérance de 0,5 à 3 kg (défaut 1 kg) | Couvrir les trois usages (#24) | Objectif « perdre » seul |
| D33 | 2026-10-25 | Couleurs neutres tant qu'aucun usage n'est défini ; jamais la couleur seule | Une baisse n'est pas forcément un progrès (#24) | Vert = baisse, rouge = hausse |
| D34 | 2026-10-25 | Onglets : Tableau de bord · Historique (date au choix, modifier, supprimer) · Export & réglages | La spec ne couvre ni l'historique ni l'export | Une seule page |
| D35 | 2026-10-25 | Saisie improbable signalée par ⚠️, jamais bloquée : écart de plus de 3 kg à la tendance des pesées antérieures (si la dernière date de moins de 30 jours), ou poids hors 20 – 300 kg | Repérer les fautes de frappe (87,4 au lieu de 78,4) sans empêcher une saisie réelle ; bornes 20 – 300 kg de la spec reprises comme avertissement | Blocage de la saisie ; bornes strictes |
| D36 | 2026-10-25 | Fourchettes de projection par la loi de Student (n − 2 ddl) à 95 % (tuile + cône) et 99 % (cône pâle autour), au lieu du facteur fixe 2 (`T_FOURCHETTE`) ; cônes sur la tendance, pas sur les pesées futures | Avec 14 à 28 pesées, le facteur 2 sous-estime l'incertitude (~10 %) ; deux niveaux montrent la zone probable et la zone extrême | Facteur 2 et 2,6 ; intervalle de prédiction des pesées (trop large, bruité) |
| D37 | 2026-10-25 | Règles : la mise à jour d'une pesée remplace tout le document, `createdAt` compris (plus d'immuabilité) | Trouvé par le test de conflit du 2.5 : une saisie hors ligne sur un jour rempli ailleurs était refusée au retour du réseau, contrairement à D6 | `createdAt` immuable côté serveur |
| D38 | 2026-10-25 | `overrides` npm : `@grpc/grpc-js` ≥ 1.14.6 sous `@firebase/firestore` ; en-têtes HTTP de sécurité et de cache sur Hosting (sans `X-Frame-Options` pour l'instant) | Alertes `npm audit` (côté serveur Node, absentes du bundle web) sans rétrograder Firebase ; cache long des fichiers versionnés, `index.html` revalidé | `npm audit fix --force` (rétrograde Firebase en 9.x) |
| D39 | 2026-10-25 | Navigation : bandeau du haut (nom, puce de synchro, avatar + menu : verrouiller, réglages, déconnexion), barre fixe en bas sur mobile / en haut dès 760 px (Tableau de bord · Historique · Réglages), bouton « + » et saisie du jour en fenêtre ; confirmations brèves (toasts) ; focus visible, cibles ≥ 44 px, `aria-current` | Usage à une main sur téléphone, actions fréquentes à portée (#27) | Onglets en haut, réglages et déconnexion dans le contenu |
| D40 | 2026-10-25 | Écrans Historique et Réglages chargés à la demande (`React.lazy`) | Demandé en test (#29) ; gain mesuré négligeable (≈ 4 Ko sur ≈ 890) : le poids vient de Firebase, nécessaire au démarrage | Découpage de Firebase en fichier séparé (cache entre déploiements) |
| D41 | 2026-10-25 | Thème à trois choix (Système · Clair · Sombre), « Système » par défaut, mémorisé par appareil | Confort de lecture selon l'environnement ; suit le réglage de l'appareil sans action (validé avec #32) | Thème sombre seul ; bascule clair / sombre sans « Système » |
| D42 | 2026-10-25 | Pesées avec note mises en évidence sur le graphique par un jeton `--highlight` d'intensité équivalente dans chaque thème ; note en info-bulle native | Repérer d'un coup d'œil les jours commentés, sans couleur codée en dur (validé avec #32) | Jaune fixe ; liste des notes à part |
| D43 | 2026-10-25 | Clé d'API web Firebase (`apiKey`) **publique par conception**, mais **restreinte** dans Google Cloud : référents `https://machimoto.web.app/*` et `https://machimoto.firebaseapp.com/*` ; API Identity Toolkit, Token Service et Cloud Firestore seulement. Alerte GitHub *secret scanning* #1 fermée en « won't fix » | La clé identifie le projet sans donner d'accès : la sécurité repose sur les règles Firestore (testées) et le chiffrement côté client. Vérifié le 2026-10-25 : sans référent → `403 API_KEY_HTTP_REFERRER_BLOCKED`. Android (jalon 3) : clé distincte, restreinte au paquet et à l'empreinte SHA-1 | Retirer la clé du repo (impossible côté web : elle est dans le bundle servi à tous) ; rotation de la clé (inutile : rien n'a fuité au sens d'un secret) |
| D44 | 2026-10-25 | Appli ouverte aux proches : inscription libre par Google, comptes indépendants et cloisonnés, aucun partage (cadrage 0.2 révisé) | Recueillir des suggestions réelles avant l'APK ; données chiffrées et cloisonnées par les règles ; quotas Spark très au-dessus de l'usage | Liste d'invités (e-mails dans Firestore) ; utilisateur unique |
| D45 | 2026-10-25 | Suggestions dans l'appli (🗨️ du bandeau) sous `users/{uid}/suggestions`, non chiffrées avec avertissement, version jointe ; création, lecture et suppression par l'auteur, pas de modification | Proches sans compte GitHub ; lecture par Maxime dans la console | Lien `mailto:` ; issues GitHub |
| D46 | 2026-10-25 | Minimisation : le profil v1.1 ne demandera que la taille (IMC adulte, mêmes seuils pour tous) ; sexe et âge seulement si une fonctionnalité les exige, facultatifs et chiffrés | RGPD et esprit de l'appli : ne collecter que l'utile | Collecter sexe et âge d'emblée |
| D47 | 2026-10-25 | `meta/keys` supprimable par son propriétaire, uniquement via « Supprimer mon compte » (saisie de « SUPPRIMER », réseau obligatoire) ; révise D25 | Permettre l'effacement complet d'un compte | Suppression interdite (D25) |
| D48 | 2026-10-25 | Code de secours aléatoire (160 bits) encapsulant la même clé de données que la phrase (meta/keys.secours), affiché une fois ; récupération = code + nouvelle phrase ; régénérable (phrase exigée) | Garde-fou contre l'oubli de la phrase sans porte dérobée : seul le détenteur du code peut récupérer ; complète D3 et D25 | Indice de phrase ; copie de la clé chez un tiers ; réinitialisation par e-mail (impossible sans que le serveur détienne la clé) |
| D49 | 2026-10-25 | Cache Firestore persistant (IndexedDB) sur le web si « Garder mes données sur cet appareil » (activé par défaut), effacé à la déconnexion et à la suppression du compte ; révise D4 | Démarrer et saisir hors ligne, y compris serveur injoignable ; la copie ne contient que ce que voit le serveur (données chiffrées, dates, clé encapsulée) | Cache mémoire seul (D4) ; option désactivée par défaut |
| D50 | 2026-10-25 | Import CSV : une pesée par jour (la dernière ligne du fichier gagne), pesées existantes différentes conservées sauf demande explicite, saisies improbables signalées sans bloquer | Reprendre un historique sans risque d'écraser une saisie par erreur ; cohérent avec D16 et D35 | Remplacement systématique ; moyenne des pesées du même jour ; refus des lignes improbables |
| D51 | 2026-10-25 | Build web : Firebase, React et Zod dans des fichiers séparés (codeSplitting Rolldown) ; seuil d'avertissement de taille à 700 kB ; révise D40 [à valider par Azaameth] | Une mise à jour de l'appli ne fait plus retélécharger les bibliothèques (cache d'un an, D38) : code de l'appli ≈ 41 kB au lieu de 884 kB ; plus d'avertissement au build | Fichier unique (D40) ; découpage plus fin de Firebase (impossible proprement) |
| D52 | 2026-10-25 | Durcissement : CSP en mode Report-Only sur Hosting (sources Firebase listées), notes CSV commençant par = + - @ préfixées d'une apostrophe à l'export (retirée au réimport), texte des suggestions traité comme donnée par Claude | Défense en profondeur sans risque de casser la connexion Google : la CSP passera en mode bloquant après une semaine sans violation dans la console | CSP bloquante d'emblée ; échapper les notes à l'import seulement |
| D53 | 2026-10-25 | Connexion par e-mail et mot de passe en plus de Google ; message d'erreur indistinct (e-mail ou mot de passe), réinitialisation sans révéler l'existence du compte ; pas de vérification d'e-mail obligatoire ; révise D15 | Ouvrir l'appli aux proches sans compte Google ; les données restent protégées par la phrase secrète, indépendante du mot de passe | Lien magique par e-mail (Firebase Dynamic Links arrêté : compliqué sur Android) ; vérification d'e-mail bloquante ; Google seul (D15) |
| D54 | 2026-10-25 | Service worker (vite-plugin-pwa, Workbox generateSW) : copie locale de l'appli sans aucune donnée, pages /__/ exclues, nouvelle version proposée et non imposée ; sw.js sans cache | Ouvrir l'appli à froid sans réseau (le bloc 2.11 ne couvrait que les données) ; recharger d'office reverrouillerait le coffre en pleine saisie | Service worker écrit à la main ; mise à jour automatique (autoUpdate) ; attendre l'APK |
 
## ⚠️ Risques
 
| Risque | Impact | Parade |
|---|---|---|
| Perte de la phrase secrète | Données chiffrées perdues | Code de secours (D48) ; gestionnaire de mots de passe ; export CSV régulier |
| Perte du keystore de release | Plus de mise à jour possible | Double sauvegarde hors de la machine |
| Fuite d'un secret dans le repo public | Compromission | `.gitignore`, revue avant commit, secret scanning de GitHub activé |
| Règles Firestore trop permissives | Fuite de données | Tests de règles obligatoires dans la CI |
| Boucle de lectures Firestore | Quota épuisé | Rester en Spark, écouter les changements plutôt que relire en boucle |
| Alertes `npm audit` dans `firebase-tools` (outil de dev, 5 « modérées » au 2026-10-25) | Aucun en production : rien n'est livré dans le bundle | 0 vulnérabilité en prod vérifiée à chaque audit ; Dependabot mensuel ; ne pas rétrograder la CLI |
 
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
| 2026-10-24 | 1.6 | Connexion Google par popup (#16), testée sur émulateur puis en réel. |
| 2026-10-24 | 1.7 | Premier déploiement : https://machimoto.web.app sert le build de `main`, connexion Google réelle OK, Firestore vérifié en europe-west1. Script `npm run deploy`. Fin du jalon 1 → `v0.1.0`. |
| 2026-10-24 | 2.1 | `core/pesees` : schémas Zod (clair / stocké), `encodePesee` / `decodePesee`. Règles en liste explicite (D19). 32 tests unitaires, 19 tests de règles dont une pesée réellement chiffrée. Règles à redéployer (`npm run deploy`). |
| 2026-10-24 | 2.1 | D20 validée ; bornes du poids passées à 0 – 5 000 kg (D21). |
| 2026-10-24 | 2.2 | `WebDataStore` (Firestore, cache mémoire) + `SyncTracker` (réseau + écritures en attente) ; `PeseeRepository` chiffre/déchiffre (D22, D23) ; indicateur de synchro. Test émulateur : document brut illisible. Logs `PERMISSION_DENIED` coupés dans les tests. |
| 2026-10-24 | 2.3 | `core/vault` (création, déverrouillage, verrouillage, changement de phrase) + écrans (`VaultGate`, `VaultSettings`) ; verrouillage auto 5 min (D12). `test:rules` sur son propre émulateur (port 8181), compatible avec `npm run emulators`. Reste : réglage du délai dans les paramètres (avec 2.4). |
| 2026-10-24 | 2.4 | Écrans : journal (saisie, historique, modifier, supprimer), graphique réglable (D29), export CSV (D28), paramètres (délai de verrouillage D12). Interfaces `PreferencesStore` et `FileExporter` (D26, D27). 68 tests unitaires. |
| 2026-10-25 | 2.4 | Graphique simplifié (courbe seule, D29 révisée), lisible avec beaucoup de points ; outils de dev (données fictives). Besoin de restitution (tendance, projection…) à préciser dans une issue. |
| 2026-10-25 | 2.6 | Spec de restitution (#24) versée dans `docs/`, arbitrages notés. `core/analyse` testé d'abord (cas obligatoires § 7), puis tableau de bord. Périodes 7 j → Tout ; moyenne 7 j remplacée par la tendance. 88 tests unitaires. |
| 2026-10-25 | 2.6 | Avertissement de saisie improbable (D35) : à la frappe dans le formulaire, ⚠️ dans l'historique. `core/analyse/plausibilite.ts`, testé. |
| 2026-10-25 | 2.6 | Graphique : tendance en courbe lissée monotone (sans dépassement) ; repères verticaux en pointillés ténus (mois ≤ 4 mois, trimestres ≤ 2 ans, années au-delà, 1ᵉʳ janvier marqué). |
| 2026-10-25 | 2.6 | Cônes à 95 % et 99 % (Student, D36) ; scénario de dev « baisse régulière » (la projection n'apparaît qu'avec ≥ 14 pesées sur 28 j et un rythme ≥ 0,1 kg/sem, D31). |
| 2026-10-25 | 2.5 | Hors ligne et conflits automatisés sous émulateur (SDK coupé du réseau, deux appareils, session perdue puis retrouvée). Bug trouvé et corrigé : règle `createdAt` immuable qui cassait D6 (D37). Indicateur : nombre de modifications en attente. Fin du jalon 2 → `v0.2.0`. |
| 2026-10-25 | Polish | Audit : README racine, CLAUDE.md et docs à jour, arborescence réelle dans le plan ; dates unifiées (`core/analyse/dates`), `stats.ts` → `periodes.ts` + `csv.ts`, constantes mortes retirées, `platform.ts` explicite ; `tests/rules` → `tests/emulateurs` (`npm run test:emulateurs`) ; 0 vulnérabilité en prod (D38) ; favicon et méta-données ; en-têtes Hosting. |
| 2026-10-25 | 0.1 | Coché (#30) : environnement opérationnel via VS Code Flatpak (D9). Écarts notés dans `plan-installation-outils.md`. D1 à D5 datées du 2026-10-23. |
| 2026-10-25 | Ergonomie | Bandeau profil, barre de navigation, bouton « + » et fenêtre de saisie du jour, toasts, accessibilité (D39) ; écrans secondaires à la demande (D40). |
| 2026-10-25 | 2.7 | Plan des finitions proposé (icônes historique, barres, notes sur le graphique, thème clair / sombre) : à valider avec #32. |
| 2026-10-25 | Sécurité | Alerte GitHub « Google API Key – Public leak » sur `src/firebase.config.ts` : clé web Firebase, publique par conception. Clé restreinte par référent et par API dans Google Cloud (vérifié : 403 hors référent), alerte fermée (D43). Relevé #28 : en-têtes personnalisés non appliqués à `/__/auth/*` → `X-Frame-Options` possible. |
| 2026-10-25 | 2.7 | Finitions : icônes ✏️ / 🗑️ (fond rouge), navigation intégrée au bandeau (zone collante unique, espacée), notes mises en évidence sur le graphique (`--highlight` équilibré : 4,55 / 5,09:1), thème Système · Clair · Sombre (D41, D42). `X-Frame-Options: DENY` ajouté (#28, sans risque pour `/__/auth/*`). |
| 2026-10-25 | 2.8 | Plan « Ouverture aux proches » (inscription ouverte, suggestions dans l'appli, version, manifeste web, suppression du compte) ; cadrage 0.2 révisé ; IMC reportée en v1.1 avec la taille, sexe non collecté (minimisation). À valider avec #33. |
| 2026-10-25 | 2.8 | Ouverture aux proches : 🗨️ suggestions (règles + tests), version 0.2.1 dans le menu, manifeste web et icônes (192 / 512 / maskable / Apple 180, générées avec `rsvg-convert`), suppression du compte (D44 à D47). Bug évité : `lireIds` appelait `stop` avant son affectation avec l'implémentation mémoire. |
| 2026-10-25 | 2.9 | Code de secours : génération Crockford, encapsulation dans meta/keys.secours, écrans (affichage unique, phrase oubliée, Réglages), règles et tests. Menu : 🚪 Se déconnecter. |
| 2026-10-25 | 2.10 | Bloc proposé par Azaameth : Machimoto (content, triste…) dans l'accueil, le départ et les écrans sans graphique ; favicon déjà dans #36. |
| 2026-10-25 | 2.11 | Démarrage hors ligne : cache Firestore persistant en option (activée par défaut), effacé à la déconnexion ; révise D4 (D49). Compromis validé par Azaameth. |
| 2026-10-25 | 2.10 | Expressions ravi, pensif, triste (variantes du SVG) et bulle « Machimoto dit » : accueil en 2 étapes (phrase puis code de secours), chargements et erreurs, listes vides, suggestions, départ (déconnexion confirmée, avec alerte si des saisies sont en attente ; suppression du compte). Texte de création du coffre corrigé (le code de secours existe depuis 2.9). |
| 2026-10-25 | 2.12 | Import CSV avec aperçu (nouvelles, différentes, ignorées, improbables) ; lecture tolérante (; / tabulation / virgule, dates ISO ou jj/mm/aaaa, virgule décimale) ; D50. Pour reprendre les pesées d'Azaameth (#39). |
| 2026-10-25 | Audit | Audit de santé : 0 vulnérabilité en prod (5 modérées dans firebase-tools, outil de dev, acceptées), dépendances à jour sauf TypeScript 7 (majeure, à part), aucun code mort ; build découpé (D51, à valider) ; Dependabot, modèle de PR, SECURITY.md ; README complet et CONTRIBUTING (poste neuf Windows/macOS/Linux) ; CLAUDE.md, plan (socle, arborescence, risques) et index des docs remis à jour. |
| 2026-10-25 | 4.5 | Bloc ajouté à la demande d'Azaameth : vérification développeur Android, obligatoire en 2027 pour installer un APK hors Play Store sans le parcours avancé ; compte à distribution limitée (20 appareils) visé. |
| 2026-10-25 | Sécurité | Revue « injection » : pas d'injection possible côté Firestore (pas de requête texte, chemin = date validée par Zod et par les règles), pas de XSS (React, aucun innerHTML) ; durcissement : CSP Report-Only, injection de formule CSV neutralisée, consigne anti-injection dans trier-suggestions (D52). |
| 2026-10-25 | 2.13 | Connexion par e-mail (création, connexion, mot de passe oublié), suppression d'un compte e-mail avec mot de passe vérifié avant effacement ; codes Firebase traduits et vérifiés sous émulateur (D53). |
| 2026-10-25 | 2.14 | Service worker : l'appli s'ouvre sans réseau (le 2.11 ne rendait hors ligne que les données, ma checklist du 2.11 était fausse sur ce point) ; nouvelles versions proposées par un bandeau ; sw.js sans cache, contrôlé par verifier-prod (D54). |
