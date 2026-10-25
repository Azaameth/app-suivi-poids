/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export default defineConfig({
  // Ce fichier vit dans config/ : la racine du projet est le dossier parent.
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
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
