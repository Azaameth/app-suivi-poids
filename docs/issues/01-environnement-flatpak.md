# Environnement : rester sur VS Code Flatpak (Java, gh, push)

**Labels :** env

Décision : on reste sur VS Code **Flatpak**. Ce qu'il voit déjà : tout le disque, tous les périphériques, le trousseau KDE, `flatpak-spawn --host`.

- [x] `gh` installé dans `~/.local/bin` (binaire officiel, checksum vérifié)
- [x] Java 21 via l'extension SDK, puis redémarrer complètement VS Code :
  ```sh
  flatpak install flathub org.freedesktop.Sdk.Extension.openjdk21//25.08
  flatpak override --user --env=FLATPAK_ENABLE_SDK_EXT=node26,openjdk21 com.visualstudio.code
  ```
- [x] Dans le terminal VS Code : `java -version` → 21, puis `npm run test:rules` OK
- [x] `gh auth login` puis `gh auth setup-git` (permet le push)

Note : quand le runtime Flatpak changera de version (25.08 → suivante), réinstaller l'extension openjdk21 sur la branche correspondante.
