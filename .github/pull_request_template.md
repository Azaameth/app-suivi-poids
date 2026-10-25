<!-- Une phrase : ce que fait la PR et pourquoi (bloc du plan, issue : « closes #… »). -->

## Changements

<!-- Par thème : ce qui change pour l'utilisateur, puis l'architecture si utile. -->

## Décisions à valider

<!-- Dxx proposées pour le registre de docs/plan-projet.md, avec la raison ; sinon supprimer. -->

## Vérifications

- [ ] `npm run verify`
- [ ] `npm run test:emulateurs` (si `firebase/`, `src/core/`, `src/adapters/` ou `tests/emulateurs/` changent)
- [ ] Aucun secret ni donnée réelle (`git status` relu)
- [ ] Plan à jour via `scripts/plan.mjs` (bloc, critères, journal, décisions)

## À tester manuellement

```sh
git fetch && git switch <branche>
npm run emulators   # terminal 1
npm run dev         # terminal 2
```

- [ ] <!-- vérifications concrètes -->
