---
name: audit-dette
description: Audit de dette technique de Professeur Machimoto — code mort, CSS inutilisé, gros fichiers, TODO, dépendances, frontières d'architecture, durée des tests — puis refactoring sans changement de comportement (rendu vérifié par captures identiques). À utiliser avant chaque jalon, ou quand Azaameth demande « regarde la dette », « refactorise », « nettoie le code ».
---

# Audit de dette

Fait une première fois le 2026-11-23, avant le jalon 3. Rien n'est réécrit « pour réécrire » :
on ne touche qu'à ce qui gêne la suite (fichier qui grossit à chaque PR, logique non testée,
dépendance au web qui bloquerait Android).

## 1. Mesurer (lecture seule, quelques secondes)

| Contrôle                        | Commande                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Exports utilisés nulle part     | `npm run check:exports` (aussi dans `verify`)                                                                                      |
| Classes CSS jamais citées       | `node .claude/skills/audit-dette/css-inutile.mjs`                                                                                  |
| Plus gros fichiers              | `find src -name '*.ts*' ! -name '*.test.*' \| xargs wc -l \| sort -n \| tail`                                                      |
| TODO, `any`, `eslint-disable`   | `grep -rnE "TODO\|FIXME\|as any\|eslint-disable\|@ts-" src scripts .claude/hooks`                                                  |
| Fichiers de test les plus lents | `npx vitest run --config config/vite.config.ts --reporter=json --outputFile=<scratchpad>/vt.json` puis trier `endTime - startTime` |
| API web hors `adapters/`        | `grep -rln "localStorage\|indexedDB\|serviceWorker\|firebase/" src/core src/features`                                              |

Pas de `npx <paquet>` téléchargé à la volée (knip, ts-prune…) : refusé par le mode auto, et
inutile ici.

## 2. Juger

- **Gros fichier** : le découper seulement s'il mêle des responsabilités (calcul / gestes / dessin)
  **et** qu'il change souvent (`git log --oneline -- <fichier> | head`).
- **Logique pure dans un composant** : la sortir dans un `.ts` voisin, testé (ex. `cadre.ts`).
- **Jalon 3** : tout ce qui suppose un navigateur doit rester dans `adapters/web/`.

## 3. Refactorer sans changer le comportement

1. Branche `chore/refactor-<sujet>`.
2. Déplacer le code **tel quel** ; les tests existants doivent passer sans retouche.
3. Ajouter des tests unitaires à ce qui devient pur.
4. Interface touchée : captures **avant / après** identiques à l'octet près :
   - `voir-appli` sur la branche → copier les PNG dans le scratchpad (`apres/`) ;
   - `git stash push -u` → mêmes captures (`avant/`) → `git stash pop` ;
   - `cmp -s avant/X apres/X` pour chaque capture. Les données fictives sont reproductibles le
     même jour, donc toute différence est un vrai changement de rendu.
5. Skill `ouvrir-pr` ; dans la PR, ce qui a été mesuré, changé, et volontairement laissé.
