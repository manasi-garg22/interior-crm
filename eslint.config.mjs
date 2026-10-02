import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Root config: lints the workspace packages and the test suite.
 * `apps/web` has its own config because it needs the Next.js rule sets.
 */
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/coverage/**',
    'apps/web/**',
    'packages/database/src/generated/**',
    'test-results/**',
    'playwright-report/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The seed script and CLI-ish tooling are allowed to talk to the terminal.
    files: ['packages/database/src/seed*.ts', 'packages/database/src/seed/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
])
