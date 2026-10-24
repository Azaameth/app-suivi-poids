# Environnement : VS Code Flatpak sans Java, gh ni identifiants GitHub

**Labels :** env

VS Code tourne en Flatpak : Claude Code y voit Node 26 (SDK Flatpak) mais **ni Java, ni `gh`, ni identifiants git**.

Conséquences :
- `npm run test:rules` échoue en local (l'émulateur Firestore exige Java 21). Je l'ai validé avec un JRE portable temporaire : 9/9 OK.
- Je ne peux ni pousser, ni ouvrir de PR, ni créer d'issues.

Options :
1. **(recommandé)** VS Code natif (`paru -S visual-studio-code-bin`) + `sudo pacman -S jdk21-openjdk github-cli`, puis `gh auth login`.
2. Garder le Flatpak et lui ouvrir l'accès à l'hôte (`flatpak-spawn --host`, overrides) : plus fragile.

- [ ] Choix fait
- [ ] `java -version` → 21, `gh auth status` OK depuis le terminal de VS Code
