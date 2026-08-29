import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import { AppsScriptCockpitGateway } from '../../src/infrastructure/apps-script/apps-script-cockpit-gateway';

const summary: DashboardSummaryDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  signals: 12,
  watchlist: 8,
  ready: 3,
  activeTradePlans: 2,
  openPositions: 1,
  closedTrades: 14
};

afterEach(() => vi.unstubAllGlobals());

describe('AppsScriptCockpitGateway', () => {
  it('adapts google.script.run success callbacks to a Promise', async () => {
    let success: ((value: DashboardSummaryDto) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getDashboardSummary: vi.fn(() => success?.(summary))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getDashboardSummary()).resolves.toEqual(summary);
    expect(runner.getDashboardSummary).toHaveBeenCalledOnce();
  });

  it('normalizes Apps Script failures as Error objects', async () => {
    let failure: ((error: unknown) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn(() => runner),
      withFailureHandler: vi.fn((handler) => {
        failure = handler;
        return runner;
      }),
      getDashboardSummary: vi.fn(() => failure?.({ message: 'Backend failed' }))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getDashboardSummary()).rejects.toThrow(
      'Backend failed'
    );
  });

  it('loads the Watchlist through the Apps Script callback bridge', async () => {
    const watchlist = { generatedAt: summary.generatedAt, items: [] };
    let success: ((value: typeof watchlist) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getWatchlist: vi.fn(() => success?.(watchlist))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getWatchlist()).resolves.toEqual(watchlist);
    expect(runner.getWatchlist).toHaveBeenCalledOnce();
  });

  it('loads trading accounts through the Apps Script callback bridge', async () => {
    const accounts = { accounts: [{ id: 'A1', name: 'Primary', baseCurrency: 'CAD' }] };
    let success: ((value: typeof accounts) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getTradingAccounts: vi.fn(() => success?.(accounts))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getTradingAccounts()).resolves.toEqual(accounts);
    expect(runner.getTradingAccounts).toHaveBeenCalledOnce();
  });

  it('sends a typed Trade Plan command and resolves the backend result', async () => {
    const result = {
      kind: 'created' as const,
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      accountId: 'A1',
      status: 'DRAFT'
    };
    let success: ((value: typeof result) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      createTradePlan: vi.fn(() => success?.(result))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    const command = {
      watchlistId: 'WL-1',
      accountId: 'A1',
      breakoutLevel: 101,
      invalidationLevel: 95,
      eventRisk: 'CLEAR'
    };
    await expect(new AppsScriptCockpitGateway().createTradePlan(command)).resolves.toEqual(result);
    expect(runner.createTradePlan).toHaveBeenCalledWith(command);
  });

  it('loads Trade Plans through the Apps Script callback bridge', async () => {
    const tradePlans = { generatedAt: summary.generatedAt, items: [] };
    let success: ((value: typeof tradePlans) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getTradePlans: vi.fn(() => success?.(tradePlans))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getTradePlans()).resolves.toEqual(tradePlans);
    expect(runner.getTradePlans).toHaveBeenCalledOnce();
  });

  it('sends an execute Trade Plan command through the Apps Script bridge', async () => {
    const result = {
      kind: 'opened' as const,
      positionId: 'P-1',
      tradePlanId: 'TP-1',
      accountId: 'A1',
      ticker: 'BOX',
      openedAt: summary.generatedAt,
      actualEntry: 35,
      actualQuantity: 45,
      positionStatus: 'OPEN'
    };
    let success: ((value: typeof result) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      executeTradePlan: vi.fn(() => success?.(result))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    const command = { tradePlanId: 'TP-1' };
    await expect(new AppsScriptCockpitGateway().executeTradePlan(command)).resolves.toEqual(result);
    expect(runner.executeTradePlan).toHaveBeenCalledWith(command);
  });

  it('loads open Positions through the Apps Script callback bridge', async () => {
    const positions = { generatedAt: summary.generatedAt, items: [] };
    let success: ((value: typeof positions) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getOpenPositions: vi.fn(() => success?.(positions))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getOpenPositions()).resolves.toEqual(positions);
    expect(runner.getOpenPositions).toHaveBeenCalledOnce();
  });

  it('sends an explicit Position close command through the Apps Script bridge', async () => {
    const result = {
      positionId: 'P-1',
      accountId: 'A1',
      ticker: 'BOX',
      status: 'CLOSED',
      closedAt: summary.generatedAt,
      exitPrice: 38,
      realizedPnl: 135,
      journalCreated: true
    };
    let success: ((value: typeof result) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      closePosition: vi.fn(() => success?.(result))
    };
    vi.stubGlobal('google', { script: { run: runner } });
    const command = { positionId: 'P-1', exitPrice: 38 };

    await expect(new AppsScriptCockpitGateway().closePosition(command)).resolves.toEqual(result);
    expect(runner.closePosition).toHaveBeenCalledWith(command);
  });

  it('loads the Journal through the Apps Script callback bridge', async () => {
    const journal = { generatedAt: summary.generatedAt, items: [] };
    let success: ((value: typeof journal) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      getJournal: vi.fn(() => success?.(journal))
    };
    vi.stubGlobal('google', { script: { run: runner } });

    await expect(new AppsScriptCockpitGateway().getJournal()).resolves.toEqual(journal);
    expect(runner.getJournal).toHaveBeenCalledOnce();
  });

  it('sends planning inputs through the Apps Script callback bridge', async () => {
    const result = { tradePlanId: 'TP-1', status: 'DRAFT' };
    let success: ((value: typeof result) => void) | undefined;
    const runner = {
      withSuccessHandler: vi.fn((handler) => {
        success = handler;
        return runner;
      }),
      withFailureHandler: vi.fn(() => runner),
      updateTradePlanPlanning: vi.fn(() => success?.(result))
    };
    vi.stubGlobal('google', { script: { run: runner } });
    const command = {
      tradePlanId: 'TP-1',
      entryPrice: 35,
      stopPrice: 32,
      targetPrice: 40,
      positionSize: 25
    };

    await expect(new AppsScriptCockpitGateway().updateTradePlanPlanning(command)).resolves.toEqual(
      result
    );
    expect(runner.updateTradePlanPlanning).toHaveBeenCalledWith(command);
  });
});
