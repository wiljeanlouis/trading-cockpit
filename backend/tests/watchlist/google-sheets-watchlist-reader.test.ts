/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsWatchlistReader } from '../../src/adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-reader';
import { WATCHLIST_HEADERS } from '../../src/adapters/outbound/google-sheets/watchlist/watchlist-mapper';

afterEach(() => vi.unstubAllGlobals());

function stubSpreadsheet(rows: unknown[][], includeWatchlist = true) {
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => WATCHLIST_HEADERS.length,
    getRange: vi.fn((row: number) => ({
      getValues: () => (row === 1 ? [[...WATCHLIST_HEADERS]] : rows)
    }))
  };
  vi.stubGlobal('SpreadsheetApp', {
    getActiveSpreadsheet: () => ({
      getId: () => 'sheet-id',
      getSheetByName: () => (includeWatchlist ? sheet : null)
    })
  });
  vi.stubGlobal('PropertiesService', {
    getScriptProperties: () => ({ setProperty: vi.fn() })
  });
  return sheet;
}

describe('GoogleSheetsWatchlistReader', () => {
  it('reuses the existing physical mapper without modifying the sheet', () => {
    const row: unknown[] = Array.from({ length: WATCHLIST_HEADERS.length }, () => '');
    row[0] = 'W1';
    row[1] = 'MOMENTUM_BREAKOUT';
    row[2] = 'Momentum Breakout';
    row[3] = '1.0';
    row[4] = new Date('2026-08-27T04:00:00.000Z');
    row[5] = 'BOX';
    row[6] = 'Box, Inc.';
    row[7] = 'Technology';
    row[10] = 34.82;
    row[12] = 87;
    row[13] = 'READY';
    const sheet = stubSpreadsheet([row]);

    expect(new GoogleSheetsWatchlistReader().findAll()).toEqual([
      expect.objectContaining({ id: 'W1', ticker: 'BOX', currentPrice: 34.82, status: 'READY' })
    ]);
    expect(sheet.getRange).toHaveBeenCalledWith(2, 1, 1, WATCHLIST_HEADERS.length);
  });

  it('returns an empty list for a header-only Watchlist', () => {
    stubSpreadsheet([]);
    expect(new GoogleSheetsWatchlistReader().findAll()).toEqual([]);
  });

  it('reports a missing Watchlist as an infrastructure error', () => {
    stubSpreadsheet([], false);
    expect(() => new GoogleSheetsWatchlistReader().findAll()).toThrow('Watchlist est absente.');
  });
});
