import js from '@eslint/js';
import { readFileSync, readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const repositoryRoot = new URL('.', import.meta.url);

const backendRoot = new URL('apps/sheets/', repositoryRoot);

const sourceFileNames = readdirSync(backendRoot, {
  withFileTypes: true
})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name);

const projectGlobals = {};

for (const fileName of sourceFileNames) {
  const source = readFileSync(new URL(fileName, backendRoot), 'utf8');

  for (const match of source.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
    projectGlobals[match[1]] = 'readonly';
  }

  for (const match of source.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
    projectGlobals[match[1]] = 'readonly';
  }
}

const appsScriptGlobals = {
  PropertiesService: 'readonly',
  SpreadsheetApp: 'readonly',
  UrlFetchApp: 'readonly',
  Utilities: 'readonly'
};

const nodeGlobals = {
  Buffer: 'readonly',
  URL: 'readonly',
  console: 'readonly',
  process: 'readonly'
};

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'coverage/**', 'apps/sheets/build/**']
  },
  {
    files: ['apps/sheets/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...appsScriptGlobals,
        ...projectGlobals
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-redeclare': 'off',
      'no-useless-assignment': 'off',
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals
    },
    rules: js.configs.recommended.rules
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: nodeGlobals
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['apps/sheets/MomentumScore.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^score(52WeekHigh|RelativeVolume|MonthlyPerformance|Rsi|Sma20)$'
        }
      ]
    }
  }
);
