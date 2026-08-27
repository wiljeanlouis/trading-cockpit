import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface LegacySheet {
  headers: string[];
  rows: unknown[][];
  getLastRow(): number;
  getLastColumn(): number;
  getRange(): { getValues(): unknown[][] };
}

interface LegacyWatchlistFunctions {
  findActiveWatchlistRow(
    sheet: LegacySheet,
    ticker: unknown,
    strategyId: unknown,
    version: unknown
  ): number;
}

const watchlistSource = readFileSync(new URL('../../Watchlist.js', import.meta.url), 'utf8');
const requireColumn = (headers: string[], name: string): number => {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => header.trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Missing test column: ${name}`);
  }

  return index;
};

const loadLegacyFunctions = new Function(
  'getSheetHeaders',
  'requireColumn',
  `${watchlistSource}\nreturn { findActiveWatchlistRow };`
) as (
  getSheetHeaders: (sheet: LegacySheet) => string[],
  requireColumn: (headers: string[], name: string) => number
) => LegacyWatchlistFunctions;

const legacy = loadLegacyFunctions((sheet) => sheet.headers, requireColumn);
const headers = ['Strategy ID', 'Strategy Version', 'Ticker', 'Status'];

function sheetWithRows(rows: unknown[][]): LegacySheet {
  return {
    headers,
    rows,
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getRange: () => ({ getValues: () => rows })
  };
}

describe('legacy Watchlist duplicate semantics', () => {
  it('matches ticker and strategy ID without case or surrounding whitespace', () => {
    const sheet = sheetWithRows([[' momentum_breakout ', ' V1 ', ' urnb ', ' watching ']]);

    expect(legacy.findActiveWatchlistRow(sheet, ' URNB ', 'MOMENTUM_BREAKOUT', 'V1')).toBe(2);
  });

  it('keeps Strategy Version case-sensitive after trimming', () => {
    const sheet = sheetWithRows([['MOMENTUM_BREAKOUT', 'V1', 'URNB', 'WATCHING']]);

    expect(legacy.findActiveWatchlistRow(sheet, 'URNB', 'MOMENTUM_BREAKOUT', 'v1')).toBe(-1);
  });

  it.each(['CLOSED', 'REJECTED'])('treats %s as terminal', (status) => {
    const sheet = sheetWithRows([['MOMENTUM_BREAKOUT', 'V1', 'URNB', status]]);

    expect(legacy.findActiveWatchlistRow(sheet, 'URNB', 'MOMENTUM_BREAKOUT', 'V1')).toBe(-1);
  });

  it.each(['WATCHING', 'READY', 'PLANNED', 'ENTERED', ''])('treats %s as active', (status) => {
    const sheet = sheetWithRows([['MOMENTUM_BREAKOUT', 'V1', 'URNB', status]]);

    expect(legacy.findActiveWatchlistRow(sheet, 'URNB', 'MOMENTUM_BREAKOUT', 'V1')).toBe(2);
  });

  it('requires ticker, Strategy ID, and Strategy Version to all match', () => {
    const sheet = sheetWithRows([
      ['OTHER_STRATEGY', 'V1', 'URNB', 'WATCHING'],
      ['MOMENTUM_BREAKOUT', 'V2', 'URNB', 'WATCHING'],
      ['MOMENTUM_BREAKOUT', 'V1', 'AAPL', 'WATCHING']
    ]);

    expect(legacy.findActiveWatchlistRow(sheet, 'URNB', 'MOMENTUM_BREAKOUT', 'V1')).toBe(-1);
  });

  it('returns the physical row number of the first active duplicate', () => {
    const sheet = sheetWithRows([
      ['MOMENTUM_BREAKOUT', 'V1', 'URNB', 'CLOSED'],
      ['MOMENTUM_BREAKOUT', 'V1', 'URNB', 'WATCHING']
    ]);

    expect(legacy.findActiveWatchlistRow(sheet, 'URNB', 'MOMENTUM_BREAKOUT', 'V1')).toBe(3);
  });

  it('returns -1 when the sheet has no data row', () => {
    expect(
      legacy.findActiveWatchlistRow(sheetWithRows([]), 'URNB', 'MOMENTUM_BREAKOUT', 'V1')
    ).toBe(-1);
  });
});
