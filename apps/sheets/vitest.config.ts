import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/sheets',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
