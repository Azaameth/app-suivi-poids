---
name: ouvrir-pr
description: Ouvrir une PR de bout en bout (vérifications, commit, push, description signée à partir du modèle, attente de la CI, liens vers les issues) et faire le ménage après une fusion (PR empilées rebasculées vers main, branches fusionnées supprimées). À utiliser à la fin d'un bloc ou d'une correction, et quand Azaameth annonce qu'une PR est fusionnée.
---

# Ouvrir une PR

**GitHub en REST partout** (`gh api`, ou outils MCP GitHub en session cloud) : `gh pr …` et
`gh issue …` passent par GraphQL, refusé dans les sessions cloud de Claude Code. `gh run …` marche.

0. Une autre session ou Azaameth travaille déjà dans le dossier (hook de démarrage : worktrees,
   rebase en cours, ports pris) → travailler dans un **worktree** :
   `git worktree add ../app-suivi-poids-<sujet> -b <branche> origin/main` puis `npm ci` dedans.
1. Branche : `feat/<bloc>-<sujet>`, `fix/…`, `chore/…`, `docs/…` partie de `origin/main`
   (ou de la branche d'une PR encore ouverte si le travail en dépend : PR **empilée**, à signaler).
   ⚠️ Azaameth fusionne souvent depuis son téléphone, plusieurs PR d'affilée. Une PR empilée
   fusionnée **après** sa base atterrit sur une branche morte, pas dans `main` (vécu : #81, reprise
   par #86). Donc : n'empiler que si c'est indispensable ; titre préfixé `⛓️ après #n` ; et dès
   qu'une base est fusionnée, lancer `apres-merge.mjs` (qui rebascule la suivante vers `main`)
   **avant** de lui annoncer la suivante.
2. `npm run verify` — et `npm run test:emulateurs` si `firebase/`, `tests/emulateurs/`, `src/core/` ou
   `src/adapters/` changent. Les deux enregistrent une empreinte : **le hook refuse tout commit** sans
   vérification réussie sur l'état exact du code (la documentation seule en est dispensée).
3. Plan : `node scripts/plan.mjs cocher|critere|journal|decision …` (jamais de retouche à la main).
4. `git add -A && git commit` (Conventional Commits + ligne Co-Authored-By), puis `git push -u origin <branche>`.
5. Description : copier `.claude/skills/ouvrir-pr/modele.md` dans le scratchpad, la remplir, puis
   `gh api repos/Azaameth/app-suivi-poids/pulls -f base=<main|branche> -f head=<branche> -f title="…" -F body=@<fichier> --jq .html_url`
   (ou l'outil MCP `create_pull_request`). Le hook refuse un texte non signé, passé par variable ou
   par stdin, qu'il passe par `gh` ou par MCP.
6. CI : `node .claude/skills/ouvrir-pr/ci.mjs <n>` (attend la fin, code 0 vert / 1 échec ; en cloud,
   `subscribe_pr_activity` réveille la session à la fin de la CI). En cas d'échec :
   `gh run view <id> --log-failed`, corriger, recommencer à l'étape 2.
7. Commenter les issues liées : `gh api repos/Azaameth/app-suivi-poids/issues/<n>/comments -F body=@<fichier>`
   (texte signé) ; `Closes #n` dans la description si la PR les résout.
8. Interface touchée : vérifier en captures (skill `voir-appli`) et l'indiquer dans la PR.
9. Plusieurs PR ouvertes en même temps : elles ajoutent toutes des lignes au 📝 Journal et au
   🗂️ Registre → conflit pour la 2e fusionnée. Résolution : garder **toutes** les lignes, et
   renuméroter les décisions en double (Dxx suivant libre) dans le texte de la PR concernée.
10. Résumer à Azaameth : ce qui change, décisions à valider, commandes de test, ordre de merge.

# Après une fusion

- `node .claude/skills/ouvrir-pr/apres-merge.mjs --simuler` puis sans `--simuler` : met `main` à jour,
  rebascule vers `main` les PR empilées dont la base est fusionnée, supprime les branches fusionnées.
  Une branche dont la PR est ouverte n'est **jamais** supprimée (et le hook l'interdit de toute façon).
