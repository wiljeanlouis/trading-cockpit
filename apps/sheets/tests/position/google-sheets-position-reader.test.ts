/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsPositionReader } from '../../src/adapters/outbound/google-sheets/position/google-sheets-position-reader';
import {
  POSITION_HEADERS,
  positionToRow
} from '../../src/adapters/outbound/google-sheets/position/position-mapper';
import { openPosition } from '../fixtures/position';

afterEach(() => vi.unstubAllGlobals());

function sheetWith(rows: unknown[][]) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => POSITION_HEADERS.length,
    getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
      getValues: () =>
        row === 1 && numberOfRows > 1 ? [[...POSITION_HEADERS], ...rows] : [[...POSITION_HEADERS]]
    }))
  };
}

describe('Google Sheets Position reader', () => {
  it('reads headers and rows in one getValues call', () => {
    const sheet = sheetWith([positionToRow(openPosition)]);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsPositionReader().findAll()[0]).toMatchObject({
      id: 'P-1',
      accountId: 'A1',
      ticker: 'URNB'
    });
    expect(sheet.getRange).toHaveBeenCalledTimes(1);
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 2, POSITION_HEADERS.length);
  });
});
