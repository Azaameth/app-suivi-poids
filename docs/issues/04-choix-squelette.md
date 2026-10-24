# Choix pris pendant le squelette, à valider

**Labels :** décision

À relire, et à reporter dans le 🗂️ Registre des décisions si OK :

- [ ] **ESLint** conservé (comme prévu au plan), alors que le modèle Vite 8 propose désormais oxlint par défaut.
- [ ] **`.node-version` = 24** (LTS, utilisé par la CI). Le Node local du Flatpak est en 26.
- [ ] **`ci.yml` anticipé** (bloc 4.2) : lint, types, tests, règles sous émulateur, build.
- [ ] **Règle d'or appliquée par ESLint** : `firebase`, `@capacitor/*`, `localStorage`, `indexedDB` interdits hors `src/adapters/` (et `platform.ts`) ; `src/features/` ne peut pas importer `adapters/` ni `platform.ts`.
- [ ] **Clé encapsulée en AES-GCM** (pas AES-KW). La clé de données de travail n'est pas extractible.
- [ ] **`meta/keys`** : schéma validé par les règles, itérations ≥ 600 000, **suppression interdite** (une suppression rendrait toutes les données illisibles ; une réinitialisation se fera depuis la console).
- [ ] Configs rangées dans `config/` et `firebase/`.
