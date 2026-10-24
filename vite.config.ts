/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : requis pour que le build fonctionne aussi dans la WebView Capacitor (jalon 3).
  base: './',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
