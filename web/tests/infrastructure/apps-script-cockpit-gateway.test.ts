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
});
