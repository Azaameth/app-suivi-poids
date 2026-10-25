---
name: lire-retours
description: Récupérer en une passe tout ce qu'Azaameth a écrit ou décidé sur GitHub (commentaires d'issues et de PR, revues, lignes de code, cases cochées, issues/PR fermées ou fusionnées, messages de commits de merge, alertes de sécurité). À utiliser quand il dit « regarde les issues », « j'ai répondu », « j'ai validé la PR », ou avant de reprendre le travail.
---

# Lire les retours

1. Lancer `node .claude/skills/lire-retours/retours.mjs` (depuis le dernier passage marqué, sinon 48 h ;
   une date ISO en argument pour remonter plus loin).
2. Lire **toutes** les sections, y compris « Messages de commits sur main » : Azaameth répond parfois dans
   le champ de description du merge (cas de D20/D21 sur #19).
3. Pour chaque retour : agir ou répondre **dans le fil concerné** (texte signé, `--body-file`),
   et noter les décisions au Registre (`node scripts/plan.mjs decision …`).
4. Une fois tout traité : relancer avec `--marquer` pour fixer le point de départ du prochain passage.
