# Professeur Machimoto

Suivi de poids personnel, **chiffré de bout en bout**, utilisable hors ligne, en version web
(https://machimoto.web.app) et bientôt en APK Android.

- Une pesée par jour (poids, note facultative), historique modifiable, export CSV.
- Tableau de bord : tendance lissée, rythme sur 28 jours, variation sur 30 jours, projection à
  4 semaines avec fourchettes à 95 % et 99 %.
- Avertissement (non bloquant) sur les saisies improbables.
- Hors ligne : les saisies apparaissent tout de suite et partent au retour du réseau.

## Confidentialité

Le poids et la note sont chiffrés **dans l'appareil** (AES-GCM 256) avant d'être envoyés à
Firebase. La clé de chiffrement est elle-même protégée par une **phrase secrète** que seul
l'utilisateur connaît (PBKDF2-SHA256, 600 000 itérations) : ni Google ni Firebase ne peuvent lire
les données. Seule la date reste en clair, pour le tri.

> ⚠️ Perdre sa phrase secrète, c'est perdre ses données : aucune récupération n'est possible.

Sur le web, la clé et la phrase ne sont gardées qu'en mémoire (jamais dans le stockage du
navigateur) ; le coffre se verrouille après quelques minutes d'inactivité.

La clé d'API Firebase visible dans `src/firebase.config.ts` n'est pas un secret : elle identifie
le projet, et elle est restreinte aux domaines de l'appli et aux seules API utilisées. L'accès
aux données est contrôlé par les règles Firestore, et leur contenu est chiffré.

## Stack

Vite · React · TypeScript · Zod · Firebase (Auth Google, Firestore, Hosting ; plan gratuit) ·
Web Crypto · Vitest · GitHub Actions · Capacitor (Android, à venir).

L'appli ne dépend de Firebase qu'à travers 5 interfaces (`src/core/`), implémentées dans
`src/adapters/` : la version Android remplacera les adaptateurs sans toucher aux écrans.

## Développement

Prérequis : Node 24+, Java 21 (émulateurs Firebase).

```sh
npm install
npm run emulators   # terminal 1 : émulateurs Firebase (UI sur http://localhost:4000)
npm run dev         # terminal 2 : l'appli, connectée aux émulateurs uniquement
```

| Commande                  | Rôle                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `npm run verify`          | Contrôle anti-secrets, lint, types, tests unitaires, build |
| `npm run test:emulateurs` | Règles Firestore, stockage, hors ligne, conflits, session  |
| `npm run deploy`          | Vérifications puis déploiement (Hosting + règles)          |

En développement, l'onglet « Export & réglages » propose de générer des données fictives.

## Documentation

- [`docs/plan-projet.md`](docs/plan-projet.md) : plan, décisions, journal, arborescence
- [`docs/spec-restitution.md`](docs/spec-restitution.md) : calculs du tableau de bord
- [`docs/plan-installation-outils.md`](docs/plan-installation-outils.md) : environnement de dev

## Licence

[GNU AGPL v3](LICENSE) — Copyright © 2026 Azaameth. Toute version modifiée, redistribuée **ou
hébergée** doit publier son code source sous la même licence.
