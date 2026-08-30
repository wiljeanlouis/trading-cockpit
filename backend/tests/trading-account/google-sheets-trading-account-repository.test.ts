/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsTradingAccountRepository } from '../../src/adapters/outbound/google-sheets/trading-account/google-sheets-trading-account-repository';
import { TRADING_ACCOUNT_HEADERS } from '../../src/adapters/outbound/google-sheets/trading-account/trading-account-mapper';

afterEach(() => vi.unstubAllGlobals());

function sheetWith(rows: unknown[][]) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => TRADING_ACCOUNT_HEADERS.length,
    getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
      getValues: () =>
        row === 1 && numberOfRows > 1
          ? [[...TRADING_ACCOUNT_HEADERS], ...rows]
          : [[...TRADING_ACCOUNT_HEADERS]]
    }))
  };
}

describe('Google Sheets Trading Account repository reads', () => {
  it('reads account headers and rows in one getValues call', () => {
    const sheet = sheetWith([['A1', 'Primary', 'CAD', 0.005]]);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsTradingAccountRepository().findAll()).toEqual([
      { id: 'A1', name: 'Primary', baseCurrency: 'CAD' }
    ]);
    expect(sheet.getRange).toHaveBeenCalledTimes(1);
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 2, TRADING_ACCOUNT_HEADERS.length);
  });
});
