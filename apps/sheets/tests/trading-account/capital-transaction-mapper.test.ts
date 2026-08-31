import { describe, expect, it } from 'vitest';
import {
  CAPITAL_LEDGER_HEADERS,
  capitalTransactionFromRow,
  capitalTransactionToRow,
  capitalTransactionsFromRowsForAccount
} from '../../src/adapters/outbound/google-sheets/capital-transaction/capital-transaction-mapper';

describe('Capital Ledger mapper', () => {
  it('maps exact append-only schema in both directions', () => {
    const occurredAt = new Date('2026-08-27T12:00:00Z');
    const transaction = {
      id: 'T-1',
      accountId: 'A1',
      type: 'DEPOSIT' as const,
      amount: 1000,
      occurredAt,
      note: 'Funding'
    };
    const row = capitalTransactionToRow(transaction);
    expect([...CAPITAL_LEDGER_HEADERS]).toEqual([
      'Transaction ID',
      'Account ID',
      'Type',
      'Amount',
      'Occurred At',
      'Note'
    ]);
    expect(row).toEqual(['T-1', 'A1', 'DEPOSIT', 1000, occurredAt, 'Funding']);
    expect(capitalTransactionFromRow([...CAPITAL_LEDGER_HEADERS], row)).toEqual(transaction);
  });

  it('isolates multiple account rows in repository query mapping', () => {
    const date = new Date('2026-08-27T12:00:00Z');
    const rows = [
      ['1', 'A1', 'DEPOSIT', 100, date, ''],
      ['2', 'A2', 'WITHDRAWAL', 50, date, ''],
      ['3', 'A1', 'DEPOSIT', 25, date, '']
    ];
    expect(
      capitalTransactionsFromRowsForAccount([...CAPITAL_LEDGER_HEADERS], rows, ' a1 ')
    ).toHaveLength(2);
    expect(capitalTransactionsFromRowsForAccount([...CAPITAL_LEDGER_HEADERS], rows, 'A3')).toEqual(
      []
    );
  });
});
