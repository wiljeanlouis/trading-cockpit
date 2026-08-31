import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/core',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
