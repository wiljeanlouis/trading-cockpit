/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsDashboardSummaryRepository } from '../../src/adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-summary-repository';

afterEach(() => vi.unstubAllGlobals());

function stubActiveSpreadsheet(getSheetByName: (name: string) => unknown) {
  vi.stubGlobal('SpreadsheetApp', {
    getActiveSpreadsheet: () => ({ getId: () => 'sheet-id', getSheetByName })
  });
  vi.stubGlobal('PropertiesService', {
    getScriptProperties: () => ({ setProperty: vi.fn() })
  });
}

function sheet(headers: unknown[], rows: unknown[][], firstDataRow = 2) {
  return {
    getLastRow: () => rows.length + firstDataRow - 1,
    getLastColumn: () => headers.length,
    getRange: vi.fn((row: number) => ({
      getValues: () => (row === 1 ? [headers] : rows)
    }))
  };
}

describe('GoogleSheetsDashboardSummaryRepository', () => {
  it('reads fresh workflow counts without relying on the Dashboard sheet', () => {
    const sheets = new Map<string, ReturnType<typeof sheet>>([
      ['Momentum Ranking', sheet(['Ticker'], [['A'], ['B'], ['C']], 6)],
      [
        'Watchlist',
        sheet(
          ['Watchlist ID', 'Ticker', 'Status'],
          [
            ['W1', 'BOX', 'READY'],
            ['W2', 'URNB', 'WATCHING'],
            ['W3', '', 'READY']
          ]
        )
      ],
      [
        'Trade Plans',
        sheet(
          ['Trade Plan ID', 'Status'],
          [
            ['T1', 'DRAFT'],
            ['T2', 'EXECUTED']
          ]
        )
      ],
      [
        'Positions',
        sheet(
          ['Position ID', 'Status'],
          [
            ['P1', 'OPEN'],
            ['P2', 'CLOSED']
          ]
        )
      ],
      [
        'Journal',
        sheet(
          ['Journal ID', 'Position ID'],
          [
            ['J1', 'P2'],
            ['J2', '']
          ]
        )
      ]
    ]);
    stubActiveSpreadsheet((name) => sheets.get(name) ?? null);

    expect(new GoogleSheetsDashboardSummaryRepository().readPipelineSnapshot()).toEqual({
      signals: 3,
      watchlist: 2,
      ready: 1,
      activeTradePlans: 1,
      openPositions: 1,
      closedTrades: 1
    });
    expect(sheets.has('Dashboard')).toBe(false);
  });

  it('returns zero for absent source sheets', () => {
    stubActiveSpreadsheet(() => null);
    expect(new GoogleSheetsDashboardSummaryRepository().readPipelineSnapshot()).toEqual({
      signals: 0,
      watchlist: 0,
      ready: 0,
      activeTradePlans: 0,
      openPositions: 0,
      closedTrades: 0
    });
  });
});
