---
name: voir-appli
description: Voir l'appli tourner (dev + émulateurs) et en faire des captures mobile / bureau, clair / sombre, pour vérifier un rendu ou une correction d'écran avant d'ouvrir une PR. À utiliser dès qu'un changement touche l'interface (CSS, écran, graphique) ou qu'Azaameth signale un défaut visuel.
---

# Voir l'appli

1. **Démarrer** : `node .claude/skills/voir-appli/env-dev.mjs start --frais`
   - `--frais` relance les émulateurs : indispensable après un changement de branche ou de
     `firebase/firestore.rules` (sinon on teste contre d'anciennes règles → `permission-denied`).
   - Ports pris par les émulateurs d'Azaameth : le script le dit et ne touche à rien.
2. **Capturer** : `node .claude/skills/voir-appli/captures.mjs [--format mobile|bureau|les-deux]
[--theme sombre] [--donnees an|baisse|aucune] <écrans…>`
   - Écrans : `accueil tableau historique reglages coffre saisie objectif-perdre objectif-gagner
objectif-maintenir`, période avec `@` : `tableau@1an`, `tableau@7j` ; `axe` coche la case de l’axe (après `objectif-…` : palier IMC).
   - Compte neuf et données fictives à chaque fois ; PNG dans `.claude/etat/captures/` (ignoré).
   - **Lire la fin de la sortie** : erreurs de page et de console.
   - Premier usage sur un poste : `--installer` (Playwright dans `~/.cache`, hors du projet).
   - Écran ou parcours absent du script : l'ajouter au script plutôt qu'écrire un script jetable.
3. **Regarder** :
   - Jusqu'à ~8 captures : les lire soi-même (Read), c'est le moins coûteux.
   - Au-delà : agent `inspecteur-visuel` (Sonnet), avec les chemins et **ce qu'il faut
     vérifier** ; il renvoie un compte rendu court, les images restent hors du contexte principal.
4. **Arrêter** : `node .claude/skills/voir-appli/env-dev.mjs stop` avant de rendre la main
   (Azaameth a besoin des mêmes ports). Jamais de `pkill -f` (le hook le refuse).
5. Dans la PR : écrans vérifiés, formats et thèmes (pas les images).
