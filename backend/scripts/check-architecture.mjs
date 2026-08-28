import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src');
const webRoot = join(repositoryRoot, '../web/src');
const webTestsRoot = join(repositoryRoot, '../web/tests');
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

    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const violations = [];
const sourceFiles = collectTypeScriptFiles(sourceRoot);
const webFiles = [...collectTypeScriptFiles(webRoot), ...collectTypeScriptFiles(webTestsRoot)];

for (const filePath of sourceFiles) {
  const source = readFileSync(filePath, 'utf8');
  const repositoryPath = relative(repositoryRoot, filePath).replaceAll('\\', '/');
  const isCore = repositoryPath.includes('/core/');
  const isPort = repositoryPath.includes('/ports/');

  for (const match of source.matchAll(/\bdeclare\s+function\s+(\w+)/g)) {
    if (!match[1].startsWith('theme')) {
      violations.push(`${repositoryPath}: forbidden legacy global dependency ${match[1]}`);
    }
  }

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

for (const filePath of webFiles) {
  const source = readFileSync(filePath, 'utf8');
  const repositoryPath = relative(join(repositoryRoot, '..'), filePath).replaceAll('\\', '/');
  const isAppsScriptGateway =
    repositoryPath.endsWith('infrastructure/apps-script/apps-script-cockpit-gateway.ts') ||
    repositoryPath.endsWith('tests/infrastructure/apps-script-cockpit-gateway.test.ts');

  if (/from\s+['"][^'"]*backend\//.test(source)) {
    violations.push(`${repositoryPath}: web must not import backend implementation`);
  }
  if (/\bSpreadsheetApp\b/.test(source)) {
    violations.push(`${repositoryPath}: web must not use SpreadsheetApp`);
  }
  if (/google\.script\.run/.test(source) && !isAppsScriptGateway) {
    violations.push(
      `${repositoryPath}: google.script.run is restricted to AppsScriptCockpitGateway`
    );
  }
  if (
    /\/(?:app|features|components)\//.test(repositoryPath) &&
    /apps-script-cockpit-gateway/.test(source) &&
    !repositoryPath.endsWith('app/create-cockpit-gateway.ts')
  ) {
    violations.push(`${repositoryPath}: React components must depend on CockpitGateway`);
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Architecture check passed: ${sourceFiles.length} backend and ${webFiles.length} web modules, ` +
      'no core/port dependency on adapters, Apps Script globals, or external provider names; ' +
      'no non-theme legacy global dependency.'
  );
}
