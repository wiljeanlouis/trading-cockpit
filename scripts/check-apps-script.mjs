import { readFileSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';

const repositoryRoot = new URL('../', import.meta.url);

const sourceFileNames = readdirSync(repositoryRoot, {
  withFileTypes: true
})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort();

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

if (collisions.length > 0) {
  for (const [functionName, locations] of collisions) {
    console.error(`Duplicate global function ${functionName}: ${locations.join(', ')}`);
  }

  process.exitCode = 1;
} else {
  const menuSource = sources.get('Menu.js');

  if (!menuSource) {
    throw new Error('Menu.js is missing.');
  }

  const menuTargets = [...menuSource.matchAll(/\.addItem\(\s*'[^']+'\s*,\s*'([^']+)'/gs)].map(
    (match) => match[1]
  );

  const missingMenuTargets = menuTargets.filter((functionName) => !definitions.has(functionName));

  if (missingMenuTargets.length > 0) {
    for (const functionName of missingMenuTargets) {
      console.error(`Missing menu function: ${functionName}`);
    }

    process.exitCode = 1;
  } else {
    console.log(
      `Apps Script check passed: ${sourceFileNames.length} files, ` +
        `${definitions.size} global functions, ${menuTargets.length} menu targets.`
    );
  }
}
