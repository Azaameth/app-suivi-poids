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
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
