import { defineConfig } from 'vitest/config'

// Tests des règles Firestore : à lancer via `npm run test:rules` (démarre l'émulateur).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
  },
})
