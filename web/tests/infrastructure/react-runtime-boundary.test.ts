import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const webSrc = join(process.cwd(), 'src');

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe('React runtime boundary', () => {
  it('keeps feature components behind CockpitGateway without direct fetch or google.script.run', () => {
    const featureFiles = sourceFiles(join(webSrc, 'features'));

    for (const file of featureFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toContain('google.script.run');
      expect(source, file).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it('does not select AppsScriptCockpitGateway from the production bootstrap path', () => {
    const source = readFileSync(join(webSrc, 'main.tsx'), 'utf8');

    expect(source).toContain('AuthenticatedCockpit');
    expect(source).not.toContain('AppsScriptCockpitGateway');
  });
});
