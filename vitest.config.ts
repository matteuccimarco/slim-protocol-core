import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Disable CSS processing to avoid conflicts with parent project
  css: {
    postcss: {},
  },
  configFile: false,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    root: __dirname,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
