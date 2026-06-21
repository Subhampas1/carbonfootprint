import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '**/*.config.*',
        '**/index.ts',
        // Entry points and integration-level files covered by E2E tests
        'src/main.tsx',
        'src/App.tsx',
        // Store is mocked in all unit tests; integration-tested via E2E
        'src/store/**',
        // Hooks are thin wrappers around store; tested implicitly
        'src/hooks/**',
        // Infrastructure components (ErrorBoundary, SkipLink) tested in E2E
        'src/components/shared/ErrorBoundary.tsx',
        'src/components/shared/SkipLink.tsx',
      ],
    },
  },
});
