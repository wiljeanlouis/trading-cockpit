/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSheetsJournalReader } from '../../src/adapters/outbound/google-sheets/journal/google-sheets-journal-reader';
import {
  JOURNAL_HEADERS,
  journalEntryToRow
} from '../../src/adapters/outbound/google-sheets/journal/journal-mapper';
import { createJournalEntryFromClosedPosition } from '../../src/core/domain/journal-entry';
import { openPosition } from '../fixtures/position';

afterEach(() => vi.unstubAllGlobals());

function sheetWith(rows: unknown[][]) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => JOURNAL_HEADERS.length,
    getRange: vi.fn((row: number, _column: number, numberOfRows: number) => ({
      getValues: () =>
        row === 1 && numberOfRows > 1 ? [[...JOURNAL_HEADERS], ...rows] : [[...JOURNAL_HEADERS]]
    }))
  };
}

describe('Google Sheets Journal reader', () => {
  it('reads headers and rows in one getValues call', () => {
    const entry = createJournalEntryFromClosedPosition(
      {
        ...openPosition,
        status: 'CLOSED',
        closedAt: new Date('2026-08-27T14:00:00Z'),
        exitPrice: 12,
        realizedPnl: 10
      },
      'J-1'
    );
    const sheet = sheetWith([journalEntryToRow(entry)]);
    vi.stubGlobal('SpreadsheetApp', {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    });

    expect(new GoogleSheetsJournalReader().findAll()[0]).toMatchObject({
      id: 'J-1',
      positionId: 'P-1',
      accountId: 'A1'
    });
    expect(sheet.getRange).toHaveBeenCalledTimes(1);
    expect(sheet.getRange).toHaveBeenCalledWith(1, 1, 2, JOURNAL_HEADERS.length);
  });
});
