import { defineConfig } from 'vitest/config';

// The recommendation engine is pure TypeScript with no React Native imports,
// so it can be unit-tested in a plain Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
