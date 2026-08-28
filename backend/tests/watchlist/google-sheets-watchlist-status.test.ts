import { describe, expect, it, vi } from 'vitest';

import { updateWatchlistStatusInSheet } from '../../src/adapters/outbound/google-sheets/watchlist-status-writer';

function createSheet(headers: unknown[], rows: unknown[][]) {
  const setValue = vi.fn();
  const getRange = vi.fn((row: number, column: number, rowCount?: number) => {
    if (row === 1 && column === 1) {
      return { getValues: () => [headers], setValue };
    }

    if (row === 2 && column === 1 && rowCount !== undefined) {
      return { getValues: () => rows, setValue };
    }

    return { getValues: () => [], setValue };
  });
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => headers.length,
    getRange
  };

  return { sheet, getRange, setValue };
}

describe('Google Sheets Watchlist status update', () => {
  it('updates the first matching row using normalized headers and ID', () => {
    const { sheet, getRange, setValue } = createSheet(
      [' Ticker ', ' STATUS ', ' Watchlist ID '],
      [
        ['AAA', 'CANDIDATE', ' WL-1 '],
        ['BBB', 'CANDIDATE', 'WL-1']
      ]
    );

    updateWatchlistStatusInSheet(sheet, ' WL-1 ', 'PLANNED');

    expect(getRange).toHaveBeenLastCalledWith(2, 2);
    expect(setValue).toHaveBeenCalledOnce();
    expect(setValue).toHaveBeenCalledWith('PLANNED');
  });

  it('preserves the legacy empty Watchlist error', () => {
    const { sheet } = createSheet(['Watchlist ID', 'Status'], []);

    expect(() => updateWatchlistStatusInSheet(sheet, 'WL-9', 'PLANNED')).toThrow(
      'Watchlist vide pour ID WL-9.'
    );
  });

  it('preserves missing-column and missing-ID errors', () => {
    const missingColumn = createSheet(['Watchlist ID'], [['WL-1']]).sheet;
    const missingId = createSheet(['Watchlist ID', 'Status'], [['WL-2', 'CANDIDATE']]).sheet;

    expect(() => updateWatchlistStatusInSheet(missingColumn, 'WL-1', 'PLANNED')).toThrow(
      'Colonne absente : Status'
    );
    expect(() => updateWatchlistStatusInSheet(missingId, 'WL-1', 'PLANNED')).toThrow(
      'Watchlist ID introuvable : WL-1'
    );
  });
});
