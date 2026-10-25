---
name: ouvrir-pr
description: Ouvrir une PR de bout en bout (vérifications, commit, push, description signée à partir du modèle, attente de la CI, liens vers les issues) et faire le ménage après une fusion (PR empilées rebasculées vers main, branches fusionnées supprimées). À utiliser à la fin d'un bloc ou d'une correction, et quand Azaameth annonce qu'une PR est fusionnée.
---

# Ouvrir une PR

1. Branche : `feat/<bloc>-<sujet>`, `fix/…`, `chore/…`, `docs/…` partie de `origin/main`
   (ou de la branche d'une PR encore ouverte si le travail en dépend : PR **empilée**, à signaler).
2. `npm run verify` — et `npm run test:emulateurs` si `firebase/`, `tests/emulateurs/`, `src/core/` ou
   `src/adapters/` changent. Les deux enregistrent une empreinte : **le hook refuse tout commit** sans
   vérification réussie sur l'état exact du code (la documentation seule en est dispensée).
3. Plan : `node scripts/plan.mjs cocher|critere|journal|decision …` (jamais de retouche à la main).
4. `git add -A && git commit` (Conventional Commits + ligne Co-Authored-By), puis `git push -u origin <branche>`.
5. Description : copier `.claude/skills/ouvrir-pr/modele.md` dans le scratchpad, la remplir, puis
   `gh pr create --base <main|branche> --head <branche> --title "…" --body-file <fichier>`
   (le hook refuse un texte non signé ou passé par variable).
6. CI : `until gh pr checks <n> | grep -qE "pass|fail"; do sleep 5; done; gh pr checks <n> --watch`.
   En cas d'échec : `gh run view <id> --log-failed`, corriger, recommencer à l'étape 2.
7. Commenter les issues liées (texte signé, `--body-file`) ; `Closes #n` dans la description si la PR
   les résout.
8. Résumer à Azaameth : ce qui change, décisions à valider, commandes de test, ordre de merge.

# Après une fusion

- `node .claude/skills/ouvrir-pr/apres-merge.mjs --simuler` puis sans `--simuler` : met `main` à jour,
  rebascule vers `main` les PR empilées dont la base est fusionnée, supprime les branches fusionnées.
  Une branche dont la PR est ouverte n'est **jamais** supprimée (et le hook l'interdit de toute façon).
