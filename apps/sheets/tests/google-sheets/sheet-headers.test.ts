/// <reference types="google-apps-script" />

import { describe, expect, it, vi } from 'vitest';
import {
  DATA_SHEET_DATA_START_ROW,
  DATA_SHEET_HEADER_ROW
} from '../../src/adapters/outbound/google-sheets/data-sheet';
import {
  readSheetTable,
  readSheetHeaders,
  requireColumn
} from '../../src/adapters/outbound/google-sheets/sheet-headers';

describe('Google Sheets header infrastructure', () => {
  it('resolves trimmed headers case-insensitively and returns the first match', () => {
    expect(requireColumn(['Ticker', ' ticker ', 'Status'], ' TICKER ')).toBe(0);
  });

  it('preserves the legacy missing-column error', () => {
    expect(() => requireColumn(['Ticker'], 'Status')).toThrow('Colonne absente : Status');
  });

  it('reads and trims the physical header row', () => {
    const getValues = vi.fn(() => [[' Ticker ', 42, '']]);
    const getRange = vi.fn(() => ({ getValues }));
    const sheet = {
      getLastColumn: vi.fn(() => 3),
      getRange
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

    expect(readSheetHeaders(sheet)).toEqual(['Ticker', '42', '']);
    expect(getRange).toHaveBeenCalledWith(1, 1, 1, 3);
  });

  it('documents the DATA-sheet convention as row-1 headers and row-2 records', () => {
    const getRange = vi.fn(() => ({
      getValues: () => [
        ['ID', 'Status'],
        ['R1', 'READY']
      ]
    }));
    const sheet = {
      getLastColumn: () => 2,
      getLastRow: () => 2,
      getRange
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

    expect(DATA_SHEET_HEADER_ROW).toBe(1);
    expect(DATA_SHEET_DATA_START_ROW).toBe(2);
    expect(readSheetTable(sheet)).toEqual({
      headers: ['ID', 'Status'],
      rows: [['R1', 'READY']]
    });
    expect(getRange).toHaveBeenCalledWith(1, 1, 2, 2);
  });
});
