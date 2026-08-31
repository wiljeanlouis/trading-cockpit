/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsDashboardRepository } from '../../src/adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-repository';
import { MOMENTUM_RANKING_HEADERS } from '../../src/adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-projection';
import { POSITION_HEADERS } from '../../src/adapters/outbound/google-sheets/position/position-mapper';
import { TRADE_PLAN_HEADERS } from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-mapper';
import { WATCHLIST_HEADERS } from '../../src/adapters/outbound/google-sheets/watchlist/watchlist-mapper';

afterEach(() => vi.unstubAllGlobals());

function rowFor(headers: readonly string[], values: Record<string, unknown>): unknown[] {
  return headers.map((header) => values[header] ?? '');
}

function sheetWith(headers: readonly string[], rows: unknown[][], headerRow = 1) {
  return {
    getLastRow: () => headerRow + rows.length,
    getLastColumn: () => headers.length,
    getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
      getValues: () =>
        row === headerRow && numberOfRows > 1 ? [[...headers], ...rows] : [[...headers]]
    }))
  };
}

describe('Google Sheets Dashboard repository reads', () => {
  it('loads each Dashboard source sheet as one validated table read', () => {
    const momentum = sheetWith(MOMENTUM_RANKING_HEADERS, [
      rowFor(MOMENTUM_RANKING_HEADERS, {
        Rank: 1,
        Ticker: 'BOX',
        'Momentum Score': 87,
        Price: 34.98,
        '52W High': 0.01,
        'Relative Volume': 1.5,
        RSI: 61,
        'Review Status': 'REVIEW'
      })
    ]);
    const watchlist = sheetWith(WATCHLIST_HEADERS, [
      rowFor(WATCHLIST_HEADERS, {
        Ticker: 'BOX',
        'Current Price': 34,
        'Signal Price': 33,
        'Change Since Signal': 0.03,
        'Breakout Level': 35,
        'Distance to Breakout': -0.01,
        'Setup Status': 'CONFIRMED',
        Status: 'READY'
      })
    ]);
    const tradePlans = sheetWith(TRADE_PLAN_HEADERS, [
      rowFor(TRADE_PLAN_HEADERS, { Status: 'DRAFT' })
    ]);
    const positions = sheetWith(POSITION_HEADERS, [
      rowFor(POSITION_HEADERS, {
        Ticker: 'BOX',
        'Actual Entry': 33,
        'Current Price': 34,
        'Current Stop': 33.8,
        Target: 38,
        'Actual Quantity': 40,
        'Unrealized P&L': 40,
        'Unrealized P&L %': 0.03,
        Status: 'OPEN'
      })
    ]);
    const sheets: Record<string, unknown> = {
      'Momentum Ranking': momentum,
      Watchlist: watchlist,
      'Trade Plans': tradePlans,
      Positions: positions
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name: string) => sheets[name] ?? null
      })
    });

    const snapshot = new GoogleSheetsDashboardRepository().readSnapshot();

    expect(snapshot.momentumCandidates).toHaveLength(1);
    expect(snapshot.watchlist).toHaveLength(1);
    expect(snapshot.tradePlans).toHaveLength(1);
    expect(snapshot.positions).toHaveLength(1);
    expect(momentum.getRange).toHaveBeenCalledWith(1, 1, 2, MOMENTUM_RANKING_HEADERS.length);
    expect(momentum.getRange).toHaveBeenCalledTimes(1);
    expect(watchlist.getRange).toHaveBeenCalledTimes(1);
    expect(watchlist.getRange).toHaveBeenCalledWith(1, 1, 2, WATCHLIST_HEADERS.length);
    expect(tradePlans.getRange).toHaveBeenCalledTimes(1);
    expect(tradePlans.getRange).toHaveBeenCalledWith(1, 1, 2, TRADE_PLAN_HEADERS.length);
    expect(positions.getRange).toHaveBeenCalledTimes(1);
    expect(positions.getRange).toHaveBeenCalledWith(1, 1, 2, POSITION_HEADERS.length);
  });
});
