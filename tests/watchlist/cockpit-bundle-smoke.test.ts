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

  it('exposes exactly the migrated Watchlist, Trade Plan, Open and Close Position entrypoints', () => {
    const context = createContext({});

    new Script(bundleSource, { filename: 'Cockpit.js' }).runInContext(context);

    expect(context.CockpitBundle?.addSelectedToWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.createTradePlanFromSelectedWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.executeSelectedTradePlan).toBeTypeOf('function');
    expect(context.CockpitBundle?.closeSelectedPosition).toBeTypeOf('function');
    expect(context.CockpitBundle?.reconcileSelectedPosition).toBeTypeOf('function');
    expect(context.CockpitBundle?.setupTradingAccounts).toBeTypeOf('function');
    expect(context.CockpitBundle?.recordInitialFunding).toBeTypeOf('function');
    expect(context.CockpitBundle?.recordDeposit).toBeTypeOf('function');
    expect(context.CockpitBundle?.recordWithdrawal).toBeTypeOf('function');
    expect(context.addSelectedToWatchlist).toBeTypeOf('function');
    expect(context.createTradePlanFromSelectedWatchlist).toBeTypeOf('function');
    expect(context.executeSelectedTradePlan).toBeTypeOf('function');
    expect(context.closeSelectedPosition).toBeTypeOf('function');
    expect(context.reconcileSelectedPosition).toBeTypeOf('function');
    expect(context.setupTradingAccounts).toBeTypeOf('function');
    expect(context.recordInitialFunding).toBeTypeOf('function');
    expect(context.recordDeposit).toBeTypeOf('function');
    expect(context.recordWithdrawal).toBeTypeOf('function');
    expect(context.runArchitecturePoc).toBeUndefined();
  });
});
