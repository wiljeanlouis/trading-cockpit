import { describe, expect, it } from 'vitest';
import {
  createCapitalTransaction,
  summarizeExternalCapital,
  type CapitalTransaction
} from '@trading-cockpit/backend-core/domain/capital-transaction';

const occurredAt = new Date('2026-08-27T12:00:00Z');

describe('Capital Transaction domain', () => {
  it.each(['INITIAL_FUNDING', 'DEPOSIT', 'WITHDRAWAL'] as const)('creates valid %s', (type) => {
    expect(
      createCapitalTransaction({
        id: 'T-1',
        accountId: ' a1 ',
        type,
        amount: 1000,
        occurredAt,
        note: ' x '
      })
    ).toEqual({
      id: 'T-1',
      accountId: 'A1',
      type,
      amount: 1000,
      occurredAt,
      note: 'x'
    });
  });

  it.each([
    [{ id: '', accountId: 'A1', type: 'DEPOSIT', amount: 1, occurredAt }, 'Transaction ID absent.'],
    [{ id: 'T', accountId: '', type: 'DEPOSIT', amount: 1, occurredAt }, 'Account ID absent.'],
    [
      { id: 'T', accountId: 'A1', type: 'FEE', amount: 1, occurredAt },
      'Type de transaction invalide'
    ],
    [
      { id: 'T', accountId: 'A1', type: 'DEPOSIT', amount: 0, occurredAt },
      'montant doit être supérieur'
    ],
    [
      { id: 'T', accountId: 'A1', type: 'DEPOSIT', amount: -1, occurredAt },
      'montant doit être supérieur'
    ],
    [{ id: 'T', accountId: 'A1', type: 'DEPOSIT', amount: 1, occurredAt: null }, 'Occurred At']
  ])('rejects invalid transaction %#', (input, message) => {
    expect(() => createCapitalTransaction(input as CapitalTransaction)).toThrow(message);
  });

  it('derives direction from type and never from amount sign', () => {
    const transactions = [
      createCapitalTransaction({
        id: '1',
        accountId: 'A1',
        type: 'INITIAL_FUNDING',
        amount: 10000,
        occurredAt,
        note: ''
      }),
      createCapitalTransaction({
        id: '2',
        accountId: 'A1',
        type: 'DEPOSIT',
        amount: 2000,
        occurredAt,
        note: ''
      }),
      createCapitalTransaction({
        id: '3',
        accountId: 'A1',
        type: 'WITHDRAWAL',
        amount: 1000,
        occurredAt,
        note: ''
      })
    ];
    expect(summarizeExternalCapital('A1', 'CAD', transactions)).toEqual({
      accountId: 'A1',
      baseCurrency: 'CAD',
      initialFunding: 10000,
      totalDeposits: 2000,
      totalWithdrawals: 1000,
      netExternalCapital: 11000
    });
  });
});
