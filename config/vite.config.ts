/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export default defineConfig({
  // Ce fichier vit dans config/ : la racine du projet est le dossier parent.
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [
    react(),
    // Service worker (bloc 2.14, D54) : garde une copie de l'appli (HTML, JS, CSS, icônes) pour
    // l'ouvrir sans réseau. Aucune donnée : elles restent dans le cache Firestore chiffré (D49).
    VitePWA({
      registerType: 'prompt', // nouvelle version proposée, jamais imposée en pleine saisie
      injectRegister: false, // enregistrement par src/adapters/web/miseAJour.ts
      manifest: false, // public/manifest.webmanifest reste la référence
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // Pages de connexion Firebase : toujours servies par le réseau.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        // `favicon.svg?v=2` (contournement du cache, index.html) : même fichier que `favicon.svg`.
        ignoreURLParametersMatching: [/^v$/, /^utm_/, /^fbclid$/],
      },
    }),
  ],
  // Chemins relatifs : requis pour que le build fonctionne aussi dans la WebView Capacitor (jalon 3).
  base: './',
  // Version affichée dans le menu et jointe aux suggestions (bloc 2.8).
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // Le SDK Firestore pèse ~630 kB (~190 kB compressé) à lui seul et ne se découpe pas.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Bibliothèques dans leurs propres fichiers : une mise à jour de l'appli ne fait pas
        // retélécharger Firebase ni React (cache navigateur), et plus d'avertissement de taille.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'zod', test: /node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
