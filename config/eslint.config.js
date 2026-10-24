import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Règle d'or : seul src/adapters/ touche Firebase, Capacitor et le stockage navigateur.
const platformImports = [
  {
    group: ['firebase', 'firebase/*', '@firebase/*'],
    message: 'Firebase : src/adapters/ uniquement.',
  },
  {
    group: ['@capacitor/*', '@capacitor-firebase/*', '@aparajita/*'],
    message: 'Capacitor : src/adapters/ uniquement.',
  },
]

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
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/adapters/**', 'src/platform.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: platformImports,
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
  // Les écrans ne connaissent que src/core/ et les contextes React.
  // Les tests, eux, peuvent injecter les implémentations en mémoire.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/features/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...platformImports,
            { group: ['**/adapters/**', '**/platform'], message: 'Passer par useServices().' },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
])
