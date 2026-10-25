# Professeur Machimoto

[![CI](https://github.com/Azaameth/app-suivi-poids/actions/workflows/ci.yml/badge.svg)](https://github.com/Azaameth/app-suivi-poids/actions/workflows/ci.yml)
[![Licence : AGPL-3.0-or-later](https://img.shields.io/badge/licence-AGPL--3.0--or--later-blue)](LICENSE)

Suivi de poids personnel, **chiffré de bout en bout**, utilisable **hors ligne**.
Version web : **https://machimoto.web.app** · APK Android : à venir (jalon 3).

<p align="center"><img src="src/assets/machimoto.svg" alt="" width="96"></p>

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Confidentialité et sécurité](#confidentialité-et-sécurité)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Commandes](#commandes)
- [Arborescence](#arborescence)
- [Documentation](#documentation)
- [État du projet](#état-du-projet)
- [Licence](#licence)

## Fonctionnalités

**Pesées**

- Une pesée par jour (poids, note facultative), date passée possible, modification et
  suppression depuis l'historique.
- Avertissement **non bloquant** sur les saisies improbables (écart inhabituel à la tendance).
- **Export CSV** (sauvegarde) et **import CSV** avec aperçu : nouvelles pesées, différences,
  lignes ignorées. L'export se réimporte tel quel.

**Tableau de bord**

- **Tendance** lissée (moyenne mobile exponentielle, robuste aux jours manquants).
- **Rythme** en kg/semaine (régression sur 28 jours), **variation** sur 30 jours.
- **Projection** à 4 semaines, avec fourchettes à 95 % et 99 %.
- Graphique : période réglable (7 j → tout), axe depuis 0, notes mises en évidence.
- Les calculs sont détaillés dans [`docs/spec-restitution.md`](docs/spec-restitution.md).

**Au quotidien**

- Connexion avec un compte **Google** ou une **adresse e-mail** et un mot de passe.

- **Hors ligne** : l'appli s'ouvre sans réseau, les saisies partent au retour de la connexion.
- Thème clair, sombre ou système ; verrouillage automatique après inactivité.
- Installable comme une application (manifeste web).
- Bouton 🗨️ pour envoyer une idée ou signaler un problème.
- Professeur Machimoto, la mascotte, accompagne l'accueil, les attentes et le départ.

## Confidentialité et sécurité

- **Chiffrement dans l'appareil.** Le poids et la note sont chiffrés (AES-GCM 256, IV
  aléatoire à chaque écriture) avant d'être envoyés à Firebase. Seule la **date** reste en
  clair : elle sert d'identifiant et de tri.
- **Phrase secrète.** La clé de données est encapsulée par une clé dérivée de la phrase secrète
  (PBKDF2-SHA256, 600 000 itérations). Ni Google, ni Firebase, ni le développeur ne peuvent lire
  les pesées.
- **Code de secours.** Un code aléatoire de 160 bits, affiché une seule fois à la création du
  coffre, encapsule la même clé. Il permet de choisir une nouvelle phrase en cas d'oubli. Sans
  la phrase **ni** le code, les données sont perdues : il n'existe aucune porte dérobée.
- **Sur le web**, la clé et la phrase ne vivent **qu'en mémoire**. L'option « Garder mes données
  sur cet appareil » (activée par défaut) conserve une copie locale qui reste **chiffrée** comme
  sur le serveur. Elle est effacée à la déconnexion.
- **Règles Firestore en liste explicite.** Chaque utilisateur n'accède qu'à ses documents, et
  les champs chiffrés sont validés. Tout le reste est refusé, et ces règles sont testées en CI.
- **La clé d'API Firebase** visible dans [`src/firebase.config.ts`](src/firebase.config.ts)
  **n'est pas un secret** : elle identifie le projet. Elle est restreinte aux domaines de l'appli
  et aux seules API utilisées.

Une faille à signaler ? Voir [SECURITY.md](SECURITY.md).

## Architecture

```
 Écrans React (src/features/)        n'importent que core/ et les contextes React
            │
            ▼
 Logique pure (src/core/)            chiffrement, coffre, pesées, analyse : aucune API de plateforme
   5 interfaces : AuthService · KeyStore · DataStore · PreferencesStore · FileExporter
            │
            ▼
 Adaptateurs (src/adapters/)         web/ (Firebase JS SDK, localStorage) · memory/ (tests)
                                     native/ (Capacitor, jalon 3)
            │
 Choix des adaptateurs : src/platform.ts
```

Cette règle est **vérifiée par ESLint** : `firebase/*`, `@capacitor/*`, `localStorage` et
`indexedDB` sont interdits hors de `src/adapters/`. La version Android remplacera les adaptateurs
sans toucher aux écrans.

**Stack** : Vite · React 19 · TypeScript · Zod · Firebase plan gratuit (Auth Google ou e-mail, Firestore
`europe-west1`, Hosting) · Web Crypto · Vitest · GitHub Actions · Capacitor (à venir).

## Démarrage rapide

Prérequis : **Node 24+**, **Java 21** (pour les émulateurs Firebase), Git.

```sh
git clone https://github.com/Azaameth/app-suivi-poids.git
cd app-suivi-poids
npm install          # installe aussi le hook pre-commit anti-secrets
npm run emulators    # terminal 1 : émulateurs Firebase (UI : http://localhost:4000)
npm run dev          # terminal 2 : l'appli sur http://localhost:5173
```

En développement, l'appli parle **uniquement aux émulateurs** (projet fictif
`demo-suivi-poids`) : aucun compte Firebase n'est nécessaire et la production n'est jamais
touchée. L'onglet **Réglages** propose des outils de dev, dont la génération de données
fictives ; ils sont absents du build de production.

Installation détaillée (Windows, macOS, Linux), conventions et déploiement : voir
**[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Commandes

| Commande                  | Rôle                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`             | Appli en développement (Vite), connectée aux émulateurs                 |
| `npm run emulators`       | Émulateurs Auth + Firestore ; données conservées dans `.emulator-data/` |
| `npm run verify`          | Anti-secrets, lint, types, tests unitaires, tests des outils, build     |
| `npm run test:emulateurs` | Règles Firestore, stockage, hors ligne, session (émulateurs dédiés)     |
| `npm test`                | Tests unitaires et d'interface seuls (`npm run test:watch` en continu)  |
| `npm run format`          | Formatage Prettier de tout le projet                                    |
| `npm run deploy`          | Mainteneur : vérifications, puis Hosting et règles en production        |

## Arborescence

```
├── .github/              CI (ci.yml), Dependabot, modèle de PR
├── .githooks/            pre-commit : contrôle anti-secrets
├── .claude/              outillage de Claude Code (hooks, skills), voir CLAUDE.md
├── config/               ESLint, Prettier, Vite/Vitest, tsconfig
├── docs/                 plan projet, spécification du tableau de bord, installation
├── firebase/             firestore.rules, index, config des émulateurs de test
├── public/               favicon, icônes, manifeste web
├── scripts/              check-secrets, plan.mjs (mise à jour du plan), empreinte
├── src/
│   ├── core/             logique pure et les 5 interfaces
│   ├── adapters/         web/, memory/
│   ├── context/          contexte React des services
│   ├── features/         écrans (tableau de bord, pesées, coffre, réglages…)
│   ├── assets/           Professeur Machimoto (SVG)
│   └── platform.ts       choix des adaptateurs
└── tests/emulateurs/     tests contre les émulateurs Firebase
```

## Documentation

| Document                                                             | Contenu                                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                   | Installation sur un nouveau poste, workflow, conventions, déploiement   |
| [docs/plan-projet.md](docs/plan-projet.md)                           | **Source de vérité** : blocs, critères, registre des décisions, journal |
| [docs/spec-restitution.md](docs/spec-restitution.md)                 | Calculs du tableau de bord (tendance, rythme, projection)               |
| [docs/plan-installation-outils.md](docs/plan-installation-outils.md) | Installation pas à pas sur Arch Linux (poste d'origine)                 |
| [SECURITY.md](SECURITY.md)                                           | Signaler une vulnérabilité                                              |
| [CLAUDE.md](CLAUDE.md)                                               | Passation pour les sessions de Claude Code                              |

## État du projet

| Jalon                | Contenu                                                                   | État        |
| -------------------- | ------------------------------------------------------------------------- | ----------- |
| 1 · Socle web        | Repo, Firebase, interfaces, chiffrement, règles, auth, hébergement        | ✅ `v0.1.0` |
| 2 · Fonctionnel      | Pesées, tableau de bord, hors ligne, proches, code de secours, import CSV | ✅ `v0.2.x` |
| 3 · APK              | Capacitor Android, adaptateurs natifs, tests sur téléphone                | ⏳          |
| 4 · Distribution     | Signature, workflow de release, GitHub Releases + Obtainium               | ⏳          |
| 6 · Restitution v1.1 | Profil, objectif, repères d'IMC                                           | ⏳          |

Le détail, bloc par bloc, se trouve dans [docs/plan-projet.md](docs/plan-projet.md) (📍 Suivi).

## Licence

[GNU AGPL v3 ou ultérieure](LICENSE) (`AGPL-3.0-or-later`) — Copyright © 2026 Azaameth.
Toute version modifiée, redistribuée **ou hébergée** doit publier son code source sous la même
licence. La mascotte Professeur Machimoto est un dessin original, sous la même licence.
