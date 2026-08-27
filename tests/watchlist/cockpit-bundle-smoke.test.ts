import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { describe, expect, it } from 'vitest';

const bundlePath = new URL('../../build/Cockpit.js', import.meta.url);
const bundleSource = readFileSync(bundlePath, 'utf8');

describe('Cockpit Apps Script bundle', () => {
  it('contains no static import or export statement', () => {
    expect(bundleSource).not.toMatch(/^\s*(?:import|export)\s/m);
  });

  it('is valid JavaScript', () => {
    expect(() => new Script(bundleSource, { filename: 'Cockpit.js' })).not.toThrow();
  });

  it('exposes exactly the migrated Watchlist and Trade Plan global entrypoints', () => {
    const context = createContext({});

    new Script(bundleSource, { filename: 'Cockpit.js' }).runInContext(context);

    expect(context.CockpitBundle?.addSelectedToWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.createTradePlanFromSelectedWatchlist).toBeTypeOf('function');
    expect(context.addSelectedToWatchlist).toBeTypeOf('function');
    expect(context.createTradePlanFromSelectedWatchlist).toBeTypeOf('function');
    expect(context.runArchitecturePoc).toBeUndefined();
  });
});
