---
name: verifier-prod
description: Vérifier la production (https://machimoto.web.app) après un `npm run deploy` d'Azaameth — build servi = origin/main, en-têtes de sécurité et de cache, chemins de connexion Google intacts, manifeste et icônes, restriction de la clé d'API. Lecture seule. À utiliser dès qu'Azaameth annonce un déploiement.
---

# Vérifier la production

1. `node .claude/skills/verifier-prod/verifier.mjs` (lecture seule ; build de origin/main dans un
   worktree temporaire, comparé aux fichiers servis).
2. Rapporter le résultat point par point. Un ❌ « build » signifie le plus souvent que le déploiement
   a été lancé depuis une autre branche ou avant le dernier merge : le dire à Azaameth.
3. Ne jamais déployer soi-même (`npm run deploy` et `firebase deploy` sont interdits à Claude).
