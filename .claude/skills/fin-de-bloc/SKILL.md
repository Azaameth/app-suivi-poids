---
name: fin-de-bloc
description: Clôturer un bloc du plan projet — lancer toutes les vérifications, contrôler les fichiers sensibles, puis proposer la case à cocher, la ligne de Journal et les éventuelles décisions. À utiliser quand un bloc (1.1, 1.4…) est terminé ou avant d'ouvrir sa PR.
---

# Fin de bloc

1. Vérifications (s'arrêter et montrer la sortie au premier échec) :
   - `npm run verify` (secrets, lint, types, tests unitaires, build)
   - `npm run test:rules` si `firebase/firestore.rules` ou `tests/rules/` ont changé
     (nécessite Java 21 dans le PATH, voir CLAUDE.md §9)
   - les commandes de vérification propres au bloc dans `docs/plan-projet.md`
2. `git status` : aucun fichier de la liste « Sécurité » de CLAUDE.md §3 ne doit être suivi.
3. Rappeler à Maxime de cocher le bloc dans `docs/plan-projet.md` (📍 Suivi).
4. Proposer une ligne de 📝 Journal : `| AAAA-MM-JJ | <bloc> | <note courte> |`.
5. Lister toute nouvelle décision prise pendant le bloc, au format du 🗂️ Registre des décisions.
6. Tout problème ouvert ou question pour Maxime → une issue GitHub (`gh issue create`)
   plutôt qu'une note perdue dans la conversation.
