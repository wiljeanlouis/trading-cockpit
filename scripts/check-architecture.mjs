import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src');
const forbiddenAppsScriptGlobals = [
  'SpreadsheetApp',
  'UrlFetchApp',
  'PropertiesService',
  'Utilities',
  'ScriptApp'
];
const forbiddenProviderNames = ['Finviz'];

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

const violations = [];
const sourceFiles = collectTypeScriptFiles(sourceRoot);

for (const filePath of sourceFiles) {
  const source = readFileSync(filePath, 'utf8');
  const repositoryPath = relative(repositoryRoot, filePath).replaceAll('\\', '/');
  const isCore = repositoryPath.includes('/core/');
  const isPort = repositoryPath.includes('/ports/');

  if (isCore || isPort) {
    for (const globalName of forbiddenAppsScriptGlobals) {
      if (new RegExp(`\\b${globalName}\\b`).test(source)) {
        violations.push(`${repositoryPath}: forbidden Apps Script global ${globalName}`);
      }
    }

    for (const providerName of forbiddenProviderNames) {
      if (
        new RegExp(`\\b${providerName}\\b`, 'i').test(source) ||
        repositoryPath.toLowerCase().includes(providerName.toLowerCase())
      ) {
        violations.push(
          `${repositoryPath}: external provider name ${providerName} leaked into core/ports`
        );
      }
    }
  }

  if (isCore || isPort) {
    for (const match of source.matchAll(
      /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
    )) {
      if (match[1].includes('adapter')) {
        violations.push(`${repositoryPath}: forbidden adapter dependency ${match[1]}`);
      }
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Architecture check passed: ${sourceFiles.length} TypeScript modules, ` +
      'no core/port dependency on adapters, Apps Script globals, or external provider names.'
  );
}
