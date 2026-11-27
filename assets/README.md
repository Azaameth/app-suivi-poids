# Icône et écran de démarrage Android (bloc 3.4)

Images sources, rendues depuis la mascotte `src/assets/machimoto.svg` sur le violet de
l'appli (`#6750a4`, `theme_color` du manifeste web) :

| Fichier               | Contenu                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `icon-only.png`       | Icône classique, 1024 px, mascotte à 62 %                                                          |
| `icon-foreground.png` | Premier plan de l'icône adaptative, fond transparent, mascotte à 48 % (zone sûre de 66 dp sur 108) |
| `icon-background.png` | Arrière-plan uni                                                                                   |
| `splash.png`          | Écran de démarrage, 2732 px, mascotte à 26 %                                                       |

## Régénérer

```sh
npx @capacitor/assets@4.0.0 generate --android --iconBackgroundColor '#6750a4' --splashBackgroundColor '#6750a4'
```

Puis, avant de committer :

- `git checkout android/app/src/main/AndroidManifest.xml` (l'outil le reformate) ;
- remettre `mipmap-anydpi-v26/ic_launcher*.xml` à leur version commitée : l'outil y ajoute une
  marge de 16,7 % qui rapetisse la mascotte (elle est déjà dans `icon-foreground.png`) ;
- supprimer les `mipmap-*/ic_launcher_background.png` générés (l'arrière-plan est la couleur
  `ic_launcher_background`) ;
- redimensionner `icon-foreground.png` en `mipmap-*/ic_launcher_foreground.png` aux tailles de
  l'icône adaptative (108 dp : 81, 108, 162, 216, 324, 432 px de ldpi à xxxhdpi) : l'outil les
  produit trop petites pour une icône sans marge.
