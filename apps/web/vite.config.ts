import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '');

  const apiProxyTarget =
    env.VITE_TRADING_COCKPIT_API_PROXY_TARGET?.trim() || 'http://localhost:8080';

  return {
    envDir: repositoryRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: /^@\//,
          replacement: `${path.resolve(import.meta.dirname, './src')}/`
        }
      ]
    },
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: false
        },
        '/health': {
          target: apiProxyTarget,
          changeOrigin: false
        }
      }
    },
    build: {
      target: 'es2020',
      sourcemap: false
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      css: true
    }
  };
});