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

  it('exposes only the workbook setup and validation entrypoints', () => {
    const context = createContext({});

    new Script(bundleSource, { filename: 'Cockpit.js' }).runInContext(context);

    expect(context.CockpitBundle?.onOpen).toBeTypeOf('function');
    expect(context.CockpitBundle?.getDashboardSummary).toBeUndefined();
    expect(context.CockpitBundle?.getDashboard).toBeUndefined();
    expect(context.CockpitBundle?.refreshDashboard).toBeUndefined();
    expect(context.CockpitBundle?.getWatchlist).toBeUndefined();
    expect(context.CockpitBundle?.getMomentumRanking).toBeUndefined();
    expect(context.CockpitBundle?.getTradingAccounts).toBeUndefined();
    expect(context.CockpitBundle?.createTradePlan).toBeUndefined();
    expect(context.CockpitBundle?.getTradePlans).toBeUndefined();
    expect(context.CockpitBundle?.executeTradePlan).toBeUndefined();
    expect(context.CockpitBundle?.updateTradePlanPlanning).toBeUndefined();
    expect(context.CockpitBundle?.getOpenPositions).toBeUndefined();
    expect(context.CockpitBundle?.closePosition).toBeUndefined();
    expect(context.CockpitBundle?.getJournal).toBeUndefined();
    expect(context.CockpitBundle?.refreshFinviz).toBeUndefined();
    expect(context.CockpitBundle?.refreshSignals).toBeUndefined();
    expect(context.CockpitBundle?.refreshAllSignals).toBeUndefined();
    expect(context.CockpitBundle?.getAnalytics).toBeUndefined();
    expect(context.CockpitBundle?.refreshAnalytics).toBeUndefined();
    expect(context.CockpitBundle?.refreshMomentumRanking).toBeUndefined();
    expect(context.CockpitBundle?.initializeTradingCockpit).toBeTypeOf('function');
    expect(context.CockpitBundle?.validateTradingCockpit).toBeTypeOf('function');
    expect(context.CockpitBundle?.getTradingConfig).toBeUndefined();
    expect(context.CockpitBundle?.configureFinvizToken).toBeUndefined();
    expect(context.CockpitBundle?.getFinvizToken).toBeUndefined();
    expect(context.CockpitBundle?.setFinvizToken).toBeUndefined();
    expect(context.CockpitBundle?.checkFinvizAuth).toBeUndefined();
    expect(context.CockpitBundle?.deleteFinvizToken).toBeUndefined();
    expect(context.CockpitBundle?.addSelectedToWatchlist).toBeUndefined();
    expect(context.CockpitBundle?.createTradePlanFromSelectedWatchlist).toBeUndefined();
    expect(context.CockpitBundle?.executeSelectedTradePlan).toBeUndefined();
    expect(context.CockpitBundle?.closeSelectedPosition).toBeUndefined();
    expect(context.CockpitBundle?.reconcileSelectedPosition).toBeUndefined();
    expect(context.CockpitBundle?.recordInitialFunding).toBeUndefined();
    expect(context.CockpitBundle?.recordDeposit).toBeUndefined();
    expect(context.CockpitBundle?.recordWithdrawal).toBeUndefined();
    expect(context.addSelectedToWatchlist).toBeUndefined();
    expect(context.createTradePlanFromSelectedWatchlist).toBeUndefined();
    expect(context.executeSelectedTradePlan).toBeUndefined();
    expect(context.closeSelectedPosition).toBeUndefined();
    expect(context.reconcileSelectedPosition).toBeUndefined();
    expect(context.recordInitialFunding).toBeUndefined();
    expect(context.recordDeposit).toBeUndefined();
    expect(context.recordWithdrawal).toBeUndefined();
    expect(context.onOpen).toBeTypeOf('function');
    expect(context.getDashboardSummary).toBeUndefined();
    expect(context.getDashboard).toBeUndefined();
    expect(context.refreshDashboard).toBeUndefined();
    expect(context.getWatchlist).toBeUndefined();
    expect(context.getMomentumRanking).toBeUndefined();
    expect(context.getTradingAccounts).toBeUndefined();
    expect(context.createTradePlan).toBeUndefined();
    expect(context.getTradePlans).toBeUndefined();
    expect(context.executeTradePlan).toBeUndefined();
    expect(context.updateTradePlanPlanning).toBeUndefined();
    expect(context.getOpenPositions).toBeUndefined();
    expect(context.closePosition).toBeUndefined();
    expect(context.getJournal).toBeUndefined();
    expect(context.refreshFinviz).toBeUndefined();
    expect(context.refreshSignals).toBeUndefined();
    expect(context.refreshAllSignals).toBeUndefined();
    expect(context.getAnalytics).toBeUndefined();
    expect(context.refreshAnalytics).toBeUndefined();
    expect(context.refreshMomentumRanking).toBeUndefined();
    expect(context.initializeTradingCockpit).toBeTypeOf('function');
    expect(context.validateTradingCockpit).toBeTypeOf('function');
    expect(context.getTradingConfig).toBeUndefined();
    expect(context.configureFinvizToken).toBeUndefined();
    expect(context.getFinvizToken).toBeUndefined();
    expect(context.setFinvizToken).toBeUndefined();
    expect(context.checkFinvizAuth).toBeUndefined();
    expect(context.deleteFinvizToken).toBeUndefined();
    expect(context.runArchitecturePoc).toBeUndefined();
  });

  it('bundles only workbook setup menu callbacks', () => {
    const targets = [...bundleSource.matchAll(/\.addItem\(\s*"[^"]+"\s*,\s*"([^"]+)"/gs)].map(
      (match) => match[1]
    );
    expect(targets).toEqual(['initializeTradingCockpit', 'validateTradingCockpit']);
    expect(targets).not.toEqual(
      expect.arrayContaining([
        'refreshDashboard',
        'refreshAnalytics',
        'refreshMomentumRanking',
        'addSelectedToWatchlist',
        'setupMomentumRanking',
        'setupCockpitConfig',
        'setupTradingAccounts',
        'setupStrategies',
        'validateStrategies'
      ])
    );
  });
});
