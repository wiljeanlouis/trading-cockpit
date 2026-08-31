import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/api',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
