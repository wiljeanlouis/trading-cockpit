import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';

const repositoryRoot = new URL('../', import.meta.url);

const legacySourceFileNames = readdirSync(repositoryRoot, {
  withFileTypes: true
})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name);

const buildRoot = new URL('../build/', import.meta.url);
const bundleFileNames = existsSync(buildRoot)
  ? readdirSync(buildRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => `build/${entry.name}`)
  : [];

const sourceFileNames = [...legacySourceFileNames, ...bundleFileNames].sort();
const webHtmlPath = new URL('../build/CockpitWeb.html', import.meta.url);

if (!existsSync(webHtmlPath)) {
  throw new Error('Missing generated Apps Script web artifact: build/CockpitWeb.html');
}

const webHtml = readFileSync(webHtmlPath, 'utf8');
const reactRootPattern = /<div\b(?=[^>]*\bid=["']root["'])[^>]*>\s*<\/div>/i;
if (!reactRootPattern.test(webHtml)) {
  throw new Error('CockpitWeb.html does not contain the React root.');
}
if (/<script[^>]+src=|<link[^>]+rel=["']stylesheet["']/i.test(webHtml)) {
  throw new Error('CockpitWeb.html contains an external runtime asset.');
}

const sources = new Map(
  sourceFileNames.map((fileName) => [
    fileName,
    readFileSync(new URL(fileName, repositoryRoot), 'utf8')
  ])
);

for (const [fileName, source] of sources) {
  new Script(source, {
    filename: fileName
  });
}

new Script([...sources.values()].join('\n'), {
  filename: 'apps-script-global-namespace.js'
});

const definitions = new Map();

for (const [fileName, source] of sources) {
  for (const match of source.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
    const functionName = match[1];
    const line = source.slice(0, match.index).split('\n').length;
    const locations = definitions.get(functionName) ?? [];

    locations.push(`${fileName}:${line}`);
    definitions.set(functionName, locations);
  }
}

const collisions = [...definitions.entries()].filter(([, locations]) => locations.length > 1);
const supersededWorkflowFunctions = [
  'legacyAddSelectedToWatchlist_',
  'legacyCreateTradePlanFromSelectedWatchlist_',
  'legacyExecuteSelectedTradePlan_',
  'legacyCloseSelectedPosition_',
  'createJournalEntryFromPosition',
  'refreshScreener',
  'updateCurrentScreenerSheet',
  'validateScreenerConfig',
  'archiveSignals',
  'writeMomentumRanking',
  'findLatestSignalDate',
  'score52WeekHigh',
  'scoreRelativeVolume',
  'scoreMonthlyPerformance',
  'scoreRsi',
  'scoreSma20',
  'updateWatchlistStatus'
];
const reintroducedWorkflowFunctions = supersededWorkflowFunctions.filter((name) =>
  definitions.has(name)
);

if (collisions.length > 0 || reintroducedWorkflowFunctions.length > 0) {
  for (const [functionName, locations] of collisions) {
    console.error(`Duplicate global function ${functionName}: ${locations.join(', ')}`);
  }
  for (const functionName of reintroducedWorkflowFunctions) {
    console.error(`Superseded legacy workflow function reintroduced: ${functionName}`);
  }

  process.exitCode = 1;
} else {
  const runtimeSource = [...sources.values()].join('\n');
  const menuTargets = [
    ...runtimeSource.matchAll(/\.addItem\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/gs)
  ].map((match) => match[1]);

  if (menuTargets.length === 0) {
    throw new Error('No generated Apps Script menu targets found.');
  }

  const missingMenuTargets = menuTargets.filter((functionName) => !definitions.has(functionName));

  if (missingMenuTargets.length > 0) {
    for (const functionName of missingMenuTargets) {
      console.error(`Missing menu function: ${functionName}`);
    }

    process.exitCode = 1;
  } else {
    console.log(
      `Apps Script check passed: ${sourceFileNames.length} JavaScript files and 1 inline HTML file, ` +
        `${definitions.size} global functions, ${menuTargets.length} menu targets.`
    );
  }
}
