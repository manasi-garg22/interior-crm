import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * The layering rules below are the architecture. Conventions get violated
 * under deadline pressure; a failing lint run does not.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

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
    },
  },

  {
    // Rule 1: the Prisma *client* is reachable only from repository files.
    // Enums and row types from @crm/database are shared vocabulary and stay
    // importable anywhere — banning those would only push services into
    // re-declaring the same string unions.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['lib/**/repository.ts', 'lib/server/db.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              message:
                'Import enums and types from @crm/database instead. Query the database only from lib/modules/<domain>/repository.ts.',
            },
            {
              name: '@crm/database',
              importNames: ['prisma'],
              message:
                'Only a repository may hold the Prisma client. Call a service, or add a function to the repository.',
            },
          ],
        },
      ],
    },
  },

  {
    // Rule 2: components render, they do not contain business logic.
    files: ['components/**/*.tsx', 'components/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/modules/**'],
              message:
                'Components must not import domain services. Pass data in as props from a Server Component, or call a Server Action.',
            },
          ],
          paths: [
            { name: '@prisma/client', message: 'Components must never touch the database.' },
            { name: '@crm/database', message: 'Components must never touch the database.' },
          ],
        },
      ],
    },
  },
])

export default eslintConfig
