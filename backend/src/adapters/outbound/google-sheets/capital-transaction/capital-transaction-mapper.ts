import {
  createCapitalTransaction,
  type CapitalTransaction
} from '../../../../core/domain/capital-transaction';
import { requireColumn } from '../sheet-headers';

export const CAPITAL_LEDGER_HEADERS = [
  'Transaction ID',
  'Account ID',
  'Type',
  'Amount',
  'Occurred At',
  'Note'
] as const;

export function capitalTransactionFromRow(headers: string[], row: unknown[]): CapitalTransaction {
  return createCapitalTransaction({
    id: String(row[requireColumn(headers, 'Transaction ID')] || ''),
    accountId: String(row[requireColumn(headers, 'Account ID')] || ''),
    type: String(row[requireColumn(headers, 'Type')] || '') as CapitalTransaction['type'],
    amount: Number(row[requireColumn(headers, 'Amount')]),
    occurredAt: row[requireColumn(headers, 'Occurred At')] as Date,
    note: String(row[requireColumn(headers, 'Note')] || '')
  });
}

export function capitalTransactionToRow(
  transaction: CapitalTransaction
): Array<string | number | Date> {
  return [
    transaction.id,
    transaction.accountId,
    transaction.type,
    transaction.amount,
    transaction.occurredAt,
    transaction.note
  ];
}

export function capitalTransactionsFromRowsForAccount(
  headers: string[],
  rows: unknown[][],
  accountId: string
): CapitalTransaction[] {
  const normalizedId = String(accountId || '')
    .trim()
    .toUpperCase();
  return rows
    .map((row) => capitalTransactionFromRow(headers, row))
    .filter((transaction) => transaction.accountId === normalizedId);
}
