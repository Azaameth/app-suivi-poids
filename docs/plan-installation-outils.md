# Plan d'installation des outils — Appli perso (web + Android)
 
> **Machine cible :** Arch Linux + KDE Plasma
> **Principe :** on n'installe que ce dont le jalon en cours a besoin. Chaque bloc se termine par une **vérification** à coller dans le chat.
 
---
 
## 🤖 Instructions pour Claude (à lire en premier)
 
Tu accompagnes l'utilisateur pas à pas dans cette installation.
 
1. Regarde la section **📍 Suivi** pour savoir où on en est. Ne repropose pas ce qui est coché.
2. Avance **un bloc à la fois**. Donne les commandes du bloc, attends le résultat de la **vérification**, puis passe au suivant.
3. Si une vérification échoue, consulte la section **🧯 Dépannage** avant d'improviser.
4. Ne fais pas sauter un jalon. Les outils Android (jalon 3) ne s'installent pas avant d'en avoir besoin.
5. À la fin de chaque bloc, rappelle à l'utilisateur de cocher la case correspondante dans ce fichier.
6. Arch est une distribution en publication continue (rolling release) : si un nom de paquet a changé, vérifie avec `pacman -Ss <nom>` ou sur la page AUR avant de proposer une autre solution.
**Contexte projet :** Vite + React + TypeScript, Firebase (Auth + Firestore, plan Spark), chiffrement AES-GCM avec phrase secrète PBKDF2, 5 interfaces (`AuthService`, `KeyStore`, `DataStore`, `PreferencesStore`, `FileExporter`) avec des adaptateurs web puis natifs, Capacitor pour l'APK, repo GitHub public, GitHub Actions et Releases, Obtainium.
 
---
 
## 📍 Suivi
 
| Bloc | Jalon | Contenu | Fait |
|---|---|---|---|
| 0 | Préparation | Mise à jour du système, base-devel, assistant AUR | [ ] |
| 1.1 | Socle web | Git, GitHub CLI, clé SSH | [x] |
| 1.2 | Socle web | Node.js (via fnm) | [x] |
| 1.3 | Socle web | Java 21 (émulateurs Firebase) | [x] |
| 1.4 | Socle web | Firebase CLI | [x] |
| 1.5 | Socle web | VS Code et extensions | [x] |
| 1.6 | Socle web | Navigateur de test (Chromium) | [ ] |
| 2 | Fonctionnel | Rien de nouveau côté système (vérification seulement) | [x] |
| 3.1 | APK | KVM (accélération de l'émulateur) | [ ] |
| 3.2 | APK | Android Studio + SDK | [ ] |
| 3.3 | APK | Variables d'environnement Android | [ ] |
| 3.4 | APK | ADB, règles udev, téléphone en USB | [ ] |
| 4.1 | Distribution | Keystore de signature + GitHub Secrets | [ ] |
| 4.2 | Distribution | Obtainium sur le téléphone | [ ] |
 
> **Écarts constatés le 2026-10-25 (VS Code en Flatpak, D9)** — les cases cochées le sont par équivalence :
> - 1.1 : `gh` en binaire dans `~/.local/bin` ; push en HTTPS via `gh auth setup-git` (pas de clé SSH).
> - 1.2 / 1.3 : Node 26 et Java 21 via les extensions SDK du Flatpak (pas fnm ni `jdk21-openjdk`).
> - 1.4 : Firebase CLI en dépendance du projet (`npx firebase`), connectée au compte perso.
> - 1.5 : VS Code en Flatpak (`com.visualstudio.code`).
> - **Non fait :** bloc 0 (`paru` absent : nécessaire au bloc 3.2 pour Android Studio) et 1.6 (Chromium absent ; Firefox et le navigateur de VS Code servent aux tests ; Chromium sera utile au jalon 3 pour `chrome://inspect`).

---
 
## Bloc 0 — Préparation du système
 
```bash
sudo pacman -Syu
sudo pacman -S --needed base-devel git curl unzip which
```
 
Installez un **assistant AUR** (pour Android Studio, plus tard). Ici `paru` :
 
```bash
cd /tmp
git clone https://aur.archlinux.org/paru-bin.git
cd paru-bin && makepkg -si
cd ~ && rm -rf /tmp/paru-bin
```
 
> Si vous utilisez déjà `yay`, remplacez `paru` par `yay` dans la suite.
 
**✅ Vérification**
```bash
paru --version && gcc --version | head -1
```
 
---
 
# Jalon 1 — Socle web
 
## Bloc 1.1 — Git, GitHub CLI, SSH
 
```bash
sudo pacman -S --needed git github-cli openssh ksshaskpass
```
 
Configuration de Git :
```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre-email-perso@exemple.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
```
 
Clé SSH et connexion à GitHub :
```bash
ssh-keygen -t ed25519 -C "votre-email-perso@exemple.com"
gh auth login        # choisir : GitHub.com → SSH → la clé créée → navigateur
```
 
> 💡 Sous KDE, `ksshaskpass` combiné à KWallet retient la phrase de passe SSH. Pour l'activer :
> ```bash
> mkdir -p ~/.config/environment.d
> printf 'SSH_ASKPASS=/usr/bin/ksshaskpass\nSSH_ASKPASS_REQUIRE=prefer\n' > ~/.config/environment.d/ssh_askpass.conf
> ```
> Prend effet à la prochaine ouverture de session.
 
**✅ Vérification**
```bash
git --version && gh auth status && ssh -T git@github.com
```
*(Le message attendu de la dernière commande est « Hi <pseudo>! You've successfully authenticated ».)*
 
---
 
## Bloc 1.2 — Node.js via fnm
 
On passe par **fnm** (gestionnaire de versions de Node) plutôt que par le paquet `nodejs` du système. Chaque projet peut ainsi fixer sa version de Node, et `npm i -g` fonctionne sans `sudo`.
 
```bash
sudo pacman -S --needed fnm
```
 
Activation dans le shell :
 
*Bash* (`~/.bashrc`) :
```bash
echo 'eval "$(fnm env --use-on-cd --shell bash)"' >> ~/.bashrc && source ~/.bashrc
```
*Zsh* (`~/.zshrc`) :
```bash
echo 'eval "$(fnm env --use-on-cd --shell zsh)"' >> ~/.zshrc && source ~/.zshrc
```
 
Installation de la dernière LTS :
```bash
fnm install --lts
fnm default lts-latest
```
 
> Dans le projet, un fichier `.node-version` fixera la version (créé au jalon 1).
 
**✅ Vérification**
```bash
node -v && npm -v && which node   # le chemin doit contenir "fnm"
```
 
---
 
## Bloc 1.3 — Java 21 (pour les émulateurs Firebase)
 
Les émulateurs Firestore et Auth tournent sous Java. C'est aussi la version requise par Gradle au jalon 3.
 
```bash
sudo pacman -S --needed jdk21-openjdk
sudo archlinux-java set java-21-openjdk
```
 
**✅ Vérification**
```bash
java -version && archlinux-java status
```
 
---
 
## Bloc 1.4 — Firebase CLI
 
```bash
npm install -g firebase-tools
firebase login
```
 
> Utilisez votre **compte Google perso**. Le projet Firebase se crée ensuite dans la console (ou avec `firebase projects:create`) pendant le développement du jalon 1.
 
**✅ Vérification**
```bash
firebase --version && firebase projects:list
```
 
---
 
## Bloc 1.5 — VS Code et extensions
 
Deux options sous Arch :
 
| Paquet | Source | Marketplace d'extensions |
|---|---|---|
| `code` | dépôt officiel (`extra`) | Open VSX (presque tout est disponible) |
| `visual-studio-code-bin` | AUR | Marketplace Microsoft |
 
```bash
sudo pacman -S --needed code
# ou : paru -S visual-studio-code-bin
```
 
Extensions conseillées (pour `visual-studio-code-bin`, remplacer `code` par la commande indiquée après l'installation si elle diffère) :
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension toba.vsfire              # coloration de firestore.rules
code --install-extension vitest.explorer
code --install-extension EditorConfig.EditorConfig
```
 
**✅ Vérification**
```bash
code --version && code --list-extensions
```
 
---
 
## Bloc 1.6 — Navigateur de test
 
Chromium fournit les DevTools pour simuler le mode hors ligne et inspecter IndexedDB. Au jalon 3, il servira aussi à **déboguer la WebView Android** via `chrome://inspect`.
 
```bash
sudo pacman -S --needed chromium
```
 
**✅ Vérification**
```bash
chromium --version
```
 
---
 
### 🏁 Fin du jalon 1 — vérification complète
 
```bash
echo "--- Jalon 1 ---"
git --version; gh --version | head -1
node -v; npm -v
java -version 2>&1 | head -1
firebase --version
code --version | head -1
chromium --version
```
 
---
 
# Jalon 2 — Fonctionnel
 
Rien à installer au niveau du système. Les outils du jalon (Vitest, éventuellement Playwright) s'installent **dans le projet** avec `npm i -D`.
 
> ⚠️ Si Playwright est ajouté au projet, ne lancez pas `npx playwright install --with-deps` : la commande vise Ubuntu/Debian et échoue sous Arch. Utilisez `npx playwright install chromium` seul, ou configurez Playwright pour utiliser le Chromium du système.
 
**✅ Vérification** (dans le dossier du projet)
```bash
npm run build && npx firebase emulators:start --only auth,firestore
# interface des émulateurs : http://localhost:4000
```
 
---
 
# Jalon 3 — APK
 
## Bloc 3.1 — KVM (émulateur Android rapide)
 
```bash
lscpu | grep -i virtualization     # doit afficher VT-x ou AMD-V
ls -l /dev/kvm                      # doit exister
sudo usermod -aG kvm "$USER"
```
 
> Déconnectez-vous puis reconnectez-vous pour que l'ajout au groupe prenne effet. Si `/dev/kvm` n'existe pas, activez la virtualisation dans le BIOS/UEFI.
 
**✅ Vérification**
```bash
groups | grep -o kvm
```
 
---
 
## Bloc 3.2 — Android Studio + SDK
 
```bash
paru -S android-studio
```
 
Premier lancement (assistant d'installation) :
1. Choisir l'installation **Standard**, ce qui place le SDK dans `~/Android/Sdk`.
2. Dans **Settings → Languages & Frameworks → Android SDK** :
   - onglet *SDK Platforms* : dernière version stable d'Android ;
   - onglet *SDK Tools* : **Build-Tools**, **Platform-Tools**, **Command-line Tools (latest)**, **Emulator**.
3. Dans **Device Manager** : créer un appareil virtuel (par exemple un Pixel avec une image système récente, `x86_64`).
> Android Studio embarque son propre JDK (JBR). Gradle, lui, utilisera le JDK 21 du bloc 1.3 via `JAVA_HOME` (bloc suivant).
 
**✅ Vérification**
```bash
ls ~/Android/Sdk    # doit contenir : build-tools, platform-tools, platforms, emulator, cmdline-tools
```
 
---
 
## Bloc 3.3 — Variables d'environnement
 
On les définit dans `environment.d` pour qu'elles soient vues **à la fois** par le terminal et par les applis lancées depuis KDE (Android Studio, VS Code).
 
```bash
mkdir -p ~/.config/environment.d
cat > ~/.config/environment.d/android.conf << 'EOF'
JAVA_HOME=/usr/lib/jvm/java-21-openjdk
ANDROID_HOME=${HOME}/Android/Sdk
ANDROID_SDK_ROOT=${HOME}/Android/Sdk
PATH=${PATH}:${HOME}/Android/Sdk/platform-tools:${HOME}/Android/Sdk/emulator:${HOME}/Android/Sdk/cmdline-tools/latest/bin
EOF
```
 
> Fermez puis rouvrez la session KDE. Si votre shell ne lit pas `environment.d`, ajoutez aussi les mêmes `export` dans `~/.bashrc` ou `~/.zshrc`.
 
**✅ Vérification**
```bash
echo $ANDROID_HOME && echo $JAVA_HOME
adb --version && emulator -list-avds && sdkmanager --version
```
 
---
 
## Bloc 3.4 — Téléphone physique en USB
 
```bash
sudo pacman -S --needed android-udev
```
 
Sur le téléphone :
1. **Paramètres → À propos → Numéro de build** : toucher 7 fois pour activer les options développeur.
2. **Options pour les développeurs → Débogage USB** : activer.
3. Brancher le câble USB et accepter l'empreinte de l'ordinateur sur le téléphone.
**✅ Vérification**
```bash
adb devices      # le téléphone doit apparaître avec l'état "device" (et non "unauthorized")
```
 
> 💡 Pour déboguer l'appli quand elle tourne sur le téléphone, ouvrez `chrome://inspect` dans Chromium.
 
---
 
### 🏁 Fin du jalon 3 — vérification complète
 
Dans le dossier du projet :
```bash
npx cap doctor
npm run build && npx cap sync android
npx cap run android      # choisir l'émulateur ou le téléphone
```
 
---
 
# Jalon 4 — Distribution
 
## Bloc 4.1 — Keystore de signature + GitHub Secrets
 
`keytool` est fourni par le JDK 21 déjà installé. Le keystore se crée **hors du dossier du projet**.
 
```bash
mkdir -p ~/.android-keys && chmod 700 ~/.android-keys
keytool -genkeypair -v \
  -keystore ~/.android-keys/monapp-release.jks \
  -alias monapp -keyalg RSA -keysize 4096 -validity 10000
```
 
Envoi dans les GitHub Secrets (depuis le dossier du repo) :
```bash
base64 -w0 ~/.android-keys/monapp-release.jks | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body "monapp"
gh secret set ANDROID_KEY_PASSWORD
```
 
> ⚠️ **Sauvegardez le fichier `.jks` et ses mots de passe** (gestionnaire de mots de passe + copie hors de la machine). Sans eux, impossible de publier une mise à jour : Android refusera d'installer une version signée avec une autre clé.
 
**✅ Vérification**
```bash
gh secret list
git check-ignore -v *.jks 2>/dev/null; git status --porcelain | grep -E '\.(jks|keystore)$' || echo "OK : aucun keystore suivi par Git"
```
 
---
 
## Bloc 4.2 — Obtainium sur le téléphone
 
1. Installer **Obtainium** (APK depuis sa page GitHub officielle, ou via F-Droid / IzzyOnDroid).
2. **Ajouter une appli** → coller l'URL du repo GitHub → Obtainium suivra les Releases.
3. Autoriser Obtainium à installer des applications inconnues.
**✅ Vérification :** créer un tag de test (`git tag v0.0.1 && git push --tags`), attendre la fin du workflow, puis vérifier qu'Obtainium propose bien la mise à jour.
 
---
 
## 🧯 Dépannage
 
| Symptôme | Piste |
|---|---|
| `node: command not found` dans VS Code ou Android Studio | fnm n'est actif que dans le shell. Lancer VS Code depuis un terminal (`code .`), ou ajouter le chemin de Node dans `environment.d`. |
| Les émulateurs Firebase ne démarrent pas | Vérifier `java -version` (21) et que les ports 4000, 8080 et 9099 sont libres : `ss -ltnp \| grep -E '4000\|8080\|9099'`. |
| L'émulateur Android est très lent ou ne démarre pas | Vérifier KVM (bloc 3.1). Sous Wayland, essayer `QT_QPA_PLATFORM=xcb emulator -avd <nom>`. |
| `adb devices` affiche `unauthorized` | Débrancher, révoquer les autorisations de débogage sur le téléphone, rebrancher et accepter. |
| `adb devices` vide | Vérifier `android-udev`, essayer un autre câble ou port, vérifier que le mode USB est « Transfert de fichiers ». |
| Gradle : `Unsupported class file major version` | `JAVA_HOME` ne pointe pas vers le JDK 21 : vérifier `echo $JAVA_HOME` et `archlinux-java status`. |
| `SDK location not found` | `ANDROID_HOME` absent : rouvrir la session KDE, ou créer `android/local.properties` avec `sdk.dir=/home/<user>/Android/Sdk`. |
| Échec d'un paquet AUR après `-Syu` | Relancer `paru -S <paquet> --rebuild`. Consulter les commentaires sur la page AUR du paquet. |
 
---
 
## 📝 Journal (à remplir au fil de l'eau)
 
| Date | Bloc | Note (version installée, problème rencontré, solution) |
|---|---|---|
| | | |
 
