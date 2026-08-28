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

    expect(context.CockpitBundle?.onOpen).toBeTypeOf('function');
    expect(context.CockpitBundle?.doGet).toBeTypeOf('function');
    expect(context.CockpitBundle?.getDashboardSummary).toBeTypeOf('function');
    expect(context.CockpitBundle?.getWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.refreshFinviz).toBeTypeOf('function');
    expect(context.CockpitBundle?.refreshMomentumRanking).toBeTypeOf('function');
    expect(context.CockpitBundle?.setupMomentumRanking).toBeTypeOf('function');
    expect(context.CockpitBundle?.setupStrategies).toBeTypeOf('function');
    expect(context.CockpitBundle?.validateStrategies).toBeTypeOf('function');
    expect(context.CockpitBundle?.setupCockpitConfig).toBeTypeOf('function');
    expect(context.CockpitBundle?.getTradingConfig).toBeTypeOf('function');
    expect(context.CockpitBundle?.configureFinvizToken).toBeTypeOf('function');
    expect(context.CockpitBundle?.getFinvizToken).toBeTypeOf('function');
    expect(context.CockpitBundle?.setFinvizToken).toBeTypeOf('function');
    expect(context.CockpitBundle?.checkFinvizAuth).toBeTypeOf('function');
    expect(context.CockpitBundle?.deleteFinvizToken).toBeTypeOf('function');
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
    expect(context.onOpen).toBeTypeOf('function');
    expect(context.doGet).toBeTypeOf('function');
    expect(context.getDashboardSummary).toBeTypeOf('function');
    expect(context.getWatchlist).toBeTypeOf('function');
    expect(context.refreshFinviz).toBeTypeOf('function');
    expect(context.refreshMomentumRanking).toBeTypeOf('function');
    expect(context.setupMomentumRanking).toBeTypeOf('function');
    expect(context.setupStrategies).toBeTypeOf('function');
    expect(context.validateStrategies).toBeTypeOf('function');
    expect(context.setupCockpitConfig).toBeTypeOf('function');
    expect(context.getTradingConfig).toBeTypeOf('function');
    expect(context.configureFinvizToken).toBeTypeOf('function');
    expect(context.getFinvizToken).toBeTypeOf('function');
    expect(context.setFinvizToken).toBeTypeOf('function');
    expect(context.checkFinvizAuth).toBeTypeOf('function');
    expect(context.deleteFinvizToken).toBeTypeOf('function');
    expect(context.runArchitecturePoc).toBeUndefined();
  });

  it('bundles all 20 menu callbacks with their existing labels', () => {
    const targets = [...bundleSource.matchAll(/\.addItem\(\s*"[^"]+"\s*,\s*"([^"]+)"/gs)].map(
      (match) => match[1]
    );
    expect(targets).toHaveLength(20);
    expect(targets).toEqual(
      expect.arrayContaining([
        'refreshFinviz',
        'refreshMomentumRanking',
        'refreshDashboard',
        'refreshAnalytics',
        'addSelectedToWatchlist',
        'createTradePlanFromSelectedWatchlist',
        'executeSelectedTradePlan',
        'closeSelectedPosition',
        'reconcileSelectedPosition',
        'setupMomentumRanking',
        'setupCockpitConfig',
        'setupTradingAccounts',
        'recordInitialFunding',
        'recordDeposit',
        'recordWithdrawal',
        'setupStrategies',
        'validateStrategies',
        'configureFinvizToken',
        'applyCockpitTheme',
        'refreshDocumentation'
      ])
    );
  });
});
