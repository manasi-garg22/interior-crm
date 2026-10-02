import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Vite resolves tsconfig `paths` natively now, so the @crm/* aliases
    // work without the vite-tsconfig-paths plugin.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**', 'packages/integrations/*/src/**', 'apps/web/lib/**'],
    },
  },
})
