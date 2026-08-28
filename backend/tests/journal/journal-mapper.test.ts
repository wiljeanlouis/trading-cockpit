import { describe, expect, it } from 'vitest';
import {
  JOURNAL_HEADERS,
  journalEntriesFromRowsForPosition,
  journalEntryFromRow,
  journalEntryToRow
} from '../../src/adapters/outbound/google-sheets/journal/journal-mapper';
import { createJournalEntryFromClosedPosition } from '../../src/core/domain/journal-entry';
import { openPosition } from '../fixtures/position';

describe('Journal mapper', () => {
  it('maps all 26 columns and leaves formula columns blank on insertion', () => {
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
    const row = journalEntryToRow(entry);
    expect(row).toHaveLength(27);
    expect(row.slice(19, 22)).toEqual(['', '', '']);
    expect(journalEntryFromRow([...JOURNAL_HEADERS], row)).toMatchObject({
      id: 'J-1',
      positionId: 'P-1',
      accountId: 'A1',
      realizedPnl: 10,
      returnPercent: null,
      rMultiple: null,
      outcome: null
    });
  });

  it('maps calculated Sheet values consumed by Analytics', () => {
    const row = Array(26).fill('');
    row[0] = 'J-1';
    row[1] = 'P-1';
    row[19] = 0.2;
    row[20] = 1;
    row[21] = 'WIN';
    expect(journalEntryFromRow([...JOURNAL_HEADERS], row)).toMatchObject({
      positionId: 'P-1',
      returnPercent: 0.2,
      rMultiple: 1,
      outcome: 'WIN'
    });
  });

  it('requires the legacy Analytics contract headers', () => {
    expect(() => journalEntryFromRow([], [])).toThrow('Colonne absente :');
  });

  it.each([
    [[], 0],
    [['P-1'], 1],
    [['P-1', ' P-1 ', 'P-2'], 2]
  ])('finds 0, 1 or multiple rows for one Position ID', (positionIds, count) => {
    const rows = positionIds.map((positionId, index) => {
      const row = Array(26).fill('');
      row[0] = `J-${index + 1}`;
      row[1] = positionId;
      return row;
    });

    expect(journalEntriesFromRowsForPosition([...JOURNAL_HEADERS], rows, 'P-1')).toHaveLength(
      count
    );
  });
});
