import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(import.meta.dirname, './src')}/`
      }
    ]
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: false
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true
  }
});
