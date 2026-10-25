import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests sous émulateurs (règles, stockage, hors ligne, session) : `npm run test:emulateurs`.
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    environment: 'node',
    include: ['tests/emulateurs/**/*.test.ts'],
    fileParallelism: false,
  },
})
