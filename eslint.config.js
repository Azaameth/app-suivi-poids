import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'android']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
  // Règle d'or : seul src/adapters/ touche Firebase, Capacitor et le stockage navigateur.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/adapters/**', 'src/platform.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['firebase', 'firebase/*', '@firebase/*'],
              message: 'Firebase : src/adapters/ uniquement.',
            },
            {
              group: ['@capacitor/*', '@capacitor-firebase/*', '@aparajita/*'],
              message: 'Capacitor : src/adapters/ uniquement.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Stockage navigateur : src/adapters/ uniquement.' },
        { name: 'sessionStorage', message: 'Stockage navigateur : src/adapters/ uniquement.' },
        { name: 'indexedDB', message: 'Stockage navigateur : src/adapters/ uniquement.' },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
])
