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
    expect(context.CockpitBundle?.getDashboardSummary).toBeUndefined();
    expect(context.CockpitBundle?.getDashboard).toBeUndefined();
    expect(context.CockpitBundle?.refreshDashboard).toBeUndefined();
    expect(context.CockpitBundle?.getWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.getMomentumRanking).toBeTypeOf('function');
    expect(context.CockpitBundle?.addMomentumCandidateToWatchlist).toBeTypeOf('function');
    expect(context.CockpitBundle?.getTradingAccounts).toBeTypeOf('function');
    expect(context.CockpitBundle?.createTradePlan).toBeTypeOf('function');
    expect(context.CockpitBundle?.getTradePlans).toBeTypeOf('function');
    expect(context.CockpitBundle?.executeTradePlan).toBeTypeOf('function');
    expect(context.CockpitBundle?.updateTradePlanPlanning).toBeTypeOf('function');
    expect(context.CockpitBundle?.getOpenPositions).toBeTypeOf('function');
    expect(context.CockpitBundle?.closePosition).toBeTypeOf('function');
    expect(context.CockpitBundle?.getJournal).toBeTypeOf('function');
    expect(context.CockpitBundle?.refreshFinviz).toBeTypeOf('function');
    expect(context.CockpitBundle?.getAnalytics).toBeUndefined();
    expect(context.CockpitBundle?.refreshAnalytics).toBeUndefined();
    expect(context.CockpitBundle?.refreshMomentumRanking).toBeTypeOf('function');
    expect(context.CockpitBundle?.initializeTradingCockpit).toBeTypeOf('function');
    expect(context.CockpitBundle?.validateTradingCockpit).toBeTypeOf('function');
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
    expect(context.CockpitBundle?.recordInitialFunding).toBeTypeOf('function');
    expect(context.CockpitBundle?.recordDeposit).toBeTypeOf('function');
    expect(context.CockpitBundle?.recordWithdrawal).toBeTypeOf('function');
    expect(context.addSelectedToWatchlist).toBeTypeOf('function');
    expect(context.createTradePlanFromSelectedWatchlist).toBeTypeOf('function');
    expect(context.executeSelectedTradePlan).toBeTypeOf('function');
    expect(context.closeSelectedPosition).toBeTypeOf('function');
    expect(context.reconcileSelectedPosition).toBeTypeOf('function');
    expect(context.recordInitialFunding).toBeTypeOf('function');
    expect(context.recordDeposit).toBeTypeOf('function');
    expect(context.recordWithdrawal).toBeTypeOf('function');
    expect(context.onOpen).toBeTypeOf('function');
    expect(context.getDashboardSummary).toBeUndefined();
    expect(context.getDashboard).toBeUndefined();
    expect(context.refreshDashboard).toBeUndefined();
    expect(context.getWatchlist).toBeTypeOf('function');
    expect(context.getMomentumRanking).toBeTypeOf('function');
    expect(context.addMomentumCandidateToWatchlist).toBeTypeOf('function');
    expect(context.getTradingAccounts).toBeTypeOf('function');
    expect(context.createTradePlan).toBeTypeOf('function');
    expect(context.getTradePlans).toBeTypeOf('function');
    expect(context.executeTradePlan).toBeTypeOf('function');
    expect(context.updateTradePlanPlanning).toBeTypeOf('function');
    expect(context.getOpenPositions).toBeTypeOf('function');
    expect(context.closePosition).toBeTypeOf('function');
    expect(context.getJournal).toBeTypeOf('function');
    expect(context.refreshFinviz).toBeTypeOf('function');
    expect(context.getAnalytics).toBeUndefined();
    expect(context.refreshAnalytics).toBeUndefined();
    expect(context.refreshMomentumRanking).toBeTypeOf('function');
    expect(context.initializeTradingCockpit).toBeTypeOf('function');
    expect(context.validateTradingCockpit).toBeTypeOf('function');
    expect(context.getTradingConfig).toBeTypeOf('function');
    expect(context.configureFinvizToken).toBeTypeOf('function');
    expect(context.getFinvizToken).toBeTypeOf('function');
    expect(context.setFinvizToken).toBeTypeOf('function');
    expect(context.checkFinvizAuth).toBeTypeOf('function');
    expect(context.deleteFinvizToken).toBeTypeOf('function');
    expect(context.runArchitecturePoc).toBeUndefined();
  });

  it('bundles supported menu callbacks without retired Dashboard or Analytics actions', () => {
    const targets = [...bundleSource.matchAll(/\.addItem\(\s*"[^"]+"\s*,\s*"([^"]+)"/gs)].map(
      (match) => match[1]
    );
    expect(targets).toHaveLength(15);
    expect(targets).toEqual(
      expect.arrayContaining([
        'initializeTradingCockpit',
        'validateTradingCockpit',
        'refreshFinviz',
        'refreshMomentumRanking',
        'addSelectedToWatchlist',
        'createTradePlanFromSelectedWatchlist',
        'executeSelectedTradePlan',
        'closeSelectedPosition',
        'reconcileSelectedPosition',
        'recordInitialFunding',
        'recordDeposit',
        'recordWithdrawal',
        'configureFinvizToken',
        'applyCockpitTheme',
        'refreshDocumentation'
      ])
    );
    expect(targets).not.toEqual(
      expect.arrayContaining([
        'refreshDashboard',
        'refreshAnalytics',
        'setupMomentumRanking',
        'setupCockpitConfig',
        'setupTradingAccounts',
        'setupStrategies',
        'validateStrategies'
      ])
    );
  });
});
