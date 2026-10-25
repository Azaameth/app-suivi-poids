---
name: fin-de-bloc
description: Clôturer un bloc du plan projet — lancer toutes les vérifications, contrôler les fichiers sensibles, cocher le bloc et ses critères, ajouter la ligne de Journal et les décisions au Registre via scripts/plan.mjs. À utiliser quand un bloc (2.8, 3.1…) est terminé ou avant d'ouvrir sa PR.
---

# Fin de bloc

1. Vérifications (s'arrêter et montrer la sortie au premier échec) :
   - `npm run verify` (secrets, lint, types, tests unitaires, build) ;
   - `npm run test:emulateurs` (règles, stockage, hors ligne, session ; Java 21, voir CLAUDE.md) ;
   - les commandes de vérification propres au bloc dans `docs/plan-projet.md`.
     Les tests d'interface doivent être stables : en cas de doute, les relancer 3 fois.
2. `git status` : aucun fichier de la liste « Sécurité » de CLAUDE.md §3 ne doit être suivi.
3. Plan, **uniquement** via le script (échoue sans rien écrire si la cible est absente ou ambiguë) :
   - `node scripts/plan.mjs cocher <bloc>` ;
   - `node scripts/plan.mjs critere "<extrait unique du critère>"` pour chaque critère rempli ;
   - `node scripts/plan.mjs journal <bloc> "<ce qui a été fait, problème, solution>"` ;
   - `node scripts/plan.mjs decision "<décision>" "<raison>" "<alternatives>"` (numéro attribué).
     Un critère qui dépend d'Azaameth (test sur téléphone, console de prod) reste décoché, et la PR le dit.
4. Mettre à jour `CLAUDE.md` §4 (où on en est) si l'état du projet change.
5. Ouvrir la PR avec le skill `ouvrir-pr`. Toute question pour Azaameth → issue GitHub signée.
