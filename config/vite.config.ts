/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  // Ce fichier vit dans config/ : la racine du projet est le dossier parent.
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
  // Chemins relatifs : requis pour que le build fonctionne aussi dans la WebView Capacitor (jalon 3).
  base: './',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
