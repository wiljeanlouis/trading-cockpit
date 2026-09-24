/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addWatchlistFormulas,
  formatWatchlistRow,
  getOrCreateWatchlistSheet,
  refreshWatchlistValidations,
  validateWatchlistSchema
} from '../../src/adapters/outbound/google-sheets/watchlist/watchlist-sheet';

afterEach(() => vi.unstubAllGlobals());

describe('Watchlist physical sheet contract', () => {
  it('returns an existing sheet without rebuilding it', () => {
    const sheet = {
      getLastRow: () => 1,
      getLastColumn: () => 1,
      getRange: vi.fn(() => ({ getValues: () => [['existing']] }))
    };
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });
    expect(getOrCreateWatchlistSheet()).toBe(sheet);
    expect(sheet.getRange).not.toHaveBeenCalled();
  });

  it('validates the exact 20-column generic workflow schema', () => {
    const headers = [
      'Watchlist ID',
      'Strategy ID',
      'Strategy',
      'Signal Date',
      'Ticker',
      'Company',
      'Sector',
      'Added At',
      'Signal Price',
      'Current Price',
      'Change Since Signal',
      'Status',
      'Setup Status',
      'Trigger Level',
      'Distance to Trigger',
      'Invalidation Level',
      'Earnings Date',
      'Event Risk',
      'Notes',
      'Closed At'
    ];
    const sheet = {
      getLastColumn: () => headers.length,
      getRange: () => ({ getValues: () => [headers] })
    };
    expect(validateWatchlistSchema(sheet as never)).toBe(true);
    headers.splice(3, 1);
    expect(() => validateWatchlistSchema(sheet as never)).toThrow(
      'Watchlist utilise un ancien schéma. Colonne absente : Signal Date'
    );
  });

  it('writes exact formulas and formats', () => {
    const formulas = new Map<number, string>();
    const formats: Array<[number[], string]> = [];
    const sheet = {
      getRange: (...coordinates: number[]) => ({
        setFormula: (formula: string) => formulas.set(coordinates[1], formula),
        setNumberFormat: (format: string) => formats.push([coordinates, format])
      })
    };
    addWatchlistFormulas(sheet as never, 7);
    formatWatchlistRow(sheet as never, 7);
    expect(Object.fromEntries(formulas)).toEqual({
      10: '=IFERROR(GOOGLEFINANCE(E7,"price"),"")',
      11: '=IF(OR(I7="",J7=""),"",J7/I7-1)',
      15: '=IF(OR(J7="",N7=""),"",J7/N7-1)'
    });
    expect(formats).toEqual([
      [[7, 4], 'yyyy-mm-dd'],
      [[7, 8], 'yyyy-mm-dd hh:mm:ss'],
      [[7, 9], '$0.00'],
      [[7, 10], '$0.00'],
      [[7, 11], '0.00%'],
      [[7, 14], '$0.00'],
      [[7, 15], '0.00%'],
      [[7, 16], '$0.00'],
      [[7, 17], 'yyyy-mm-dd'],
      [[7, 20], 'yyyy-mm-dd hh:mm:ss']
    ]);
  });

  it('preserves validation lists, allow-invalid flags, ranges, and toast', () => {
    const rules: unknown[] = [];
    const validationRanges: number[][] = [];
    const headers = [
      'Watchlist ID',
      'Strategy ID',
      'Strategy',
      'Signal Date',
      'Ticker',
      'Company',
      'Sector',
      'Added At',
      'Signal Price',
      'Current Price',
      'Change Since Signal',
      'Status',
      'Setup Status',
      'Trigger Level',
      'Distance to Trigger',
      'Invalidation Level',
      'Earnings Date',
      'Event Risk',
      'Notes',
      'Closed At'
    ];
    const sheet = {
      getLastColumn: () => 20,
      getMaxRows: () => 100,
      getRange: (...coordinates: number[]) =>
        coordinates[0] === 1
          ? { getValues: () => [headers] }
          : {
              setDataValidation: (rule: unknown) => {
                validationRanges.push(coordinates);
                rules.push(rule);
              }
            }
    };
    const toast = vi.fn();
    const spreadsheet = { getSheetByName: () => sheet, toast };
    const builders: Array<{ list?: string[]; allow?: boolean }> = [];
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => spreadsheet,
      newDataValidation: () => {
        const state: { list?: string[]; allow?: boolean } = {};
        builders.push(state);
        const builder = {
          requireValueInList: (list: string[]) => {
            state.list = list;
            return builder;
          },
          setAllowInvalid: (allow: boolean) => {
            state.allow = allow;
            return builder;
          },
          build: () => state
        };
        return builder;
      }
    });
    refreshWatchlistValidations();
    expect(builders.map(({ allow }) => allow)).toEqual([false, true, true]);
    expect(builders[0].list).toEqual([
      'WATCHING',
      'READY',
      'PLANNED',
      'ENTERED',
      'CLOSED',
      'REJECTED'
    ]);
    expect(builders[1].list).toEqual([
      'WAITING_FOR_SETUP',
      'WAITING_FOR_TRIGGER',
      'TRIGGERED',
      'INVALIDATED'
    ]);
    expect(builders[2].list).toEqual([
      'CLEAR',
      'EARNINGS SOON',
      'EARNINGS TODAY',
      'POST EARNINGS',
      'OTHER'
    ]);
    expect(validationRanges).toEqual([
      [2, 12, 99, 1],
      [2, 13, 99, 1],
      [2, 18, 99, 1]
    ]);
    expect(rules).toHaveLength(3);
    expect(toast).toHaveBeenCalledWith(
      'Validations de la Watchlist mises à jour.',
      'Trading Cockpit',
      5
    );
  });
});
