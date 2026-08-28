/// <reference types="google-apps-script" />

import { describe, expect, it, vi } from 'vitest';
import {
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
});
