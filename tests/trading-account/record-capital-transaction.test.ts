import { describe, expect, it } from 'vitest';
import {
  createRecordDeposit,
  createRecordInitialFunding,
  createRecordWithdrawal,
  type RecordCapitalTransactionDependencies
} from '../../src/core/application/trading-account/record-capital-transaction';
import { createGetAccountCapitalSummary } from '../../src/core/application/trading-account/get-account-capital-summary';
import type { CapitalTransaction } from '../../src/core/domain/capital-transaction';

function context() {
  const transactions: CapitalTransaction[] = [];
  const calls: string[] = [];
  let sequence = 0;
  const accounts = [
    { id: 'A1', name: 'One', baseCurrency: 'CAD' },
    { id: 'A2', name: 'Two', baseCurrency: 'USD' }
  ];
  const dependencies: RecordCapitalTransactionDependencies = {
    tradingAccountRepository: {
      findById: (id) => {
        calls.push(`account.find:${id}`);
        return accounts.find((a) => a.id === id) ?? null;
      },
      findAll: () => accounts
    },
    capitalTransactionRepository: {
      findByAccountId: (id) => {
        calls.push(`ledger.find:${id}`);
        return transactions.filter((t) => t.accountId === id);
      },
      save: (transaction) => {
        calls.push('ledger.save');
        transactions.push(transaction);
      }
    },
    runtime: {
      newId: () => {
        calls.push('runtime.newId');
        sequence += 1;
        return `T-${sequence}`;
      },
      now: () => {
        calls.push('runtime.now');
        return new Date('2026-08-27T12:00:00Z');
      }
    }
  };
  return { dependencies, transactions, calls };
}

describe('record account capital transactions', () => {
  it('records first funding and rejects a second before consuming runtime', () => {
    const c = context();
    const record = createRecordInitialFunding(c.dependencies);
    expect(record({ accountId: 'a1', amount: 10000 })).toMatchObject({
      type: 'INITIAL_FUNDING',
      accountId: 'A1',
      amount: 10000
    });
    const callsBefore = c.calls.length;
    expect(() => record({ accountId: 'A1', amount: 5000 })).toThrow('INITIAL_FUNDING existe déjà');
    expect(c.calls.slice(callsBefore)).toEqual(['account.find:A1', 'ledger.find:A1']);
  });

  it('rejects unknown account and invalid amount without UUID', () => {
    const c = context();
    expect(() => createRecordDeposit(c.dependencies)({ accountId: 'A404', amount: 10 })).toThrow(
      'Trading Account introuvable'
    );
    expect(() => createRecordDeposit(c.dependencies)({ accountId: 'A1', amount: -1 })).toThrow(
      'montant doit être supérieur'
    );
    expect(c.calls).not.toContain('runtime.newId');
  });

  it('uses supplied timestamp without calling runtime.now', () => {
    const c = context();
    const supplied = new Date('2025-01-01T00:00:00Z');
    expect(
      createRecordDeposit(c.dependencies)({ accountId: 'A1', amount: 10, occurredAt: supplied })
        .occurredAt
    ).toBe(supplied);
    expect(c.calls).not.toContain('runtime.now');
  });

  it('isolates account summaries and currencies', () => {
    const c = context();
    createRecordInitialFunding(c.dependencies)({ accountId: 'A1', amount: 10000 });
    createRecordDeposit(c.dependencies)({ accountId: 'A1', amount: 1000 });
    createRecordInitialFunding(c.dependencies)({ accountId: 'A2', amount: 5000 });
    createRecordWithdrawal(c.dependencies)({ accountId: 'A2', amount: 500 });
    const summary = createGetAccountCapitalSummary(
      c.dependencies.tradingAccountRepository,
      c.dependencies.capitalTransactionRepository
    );
    expect(summary('A1')).toMatchObject({ baseCurrency: 'CAD', netExternalCapital: 11000 });
    expect(summary('A2')).toMatchObject({ baseCurrency: 'USD', netExternalCapital: 4500 });
  });

  it('does not enforce withdrawal against an unavailable cash model', () => {
    const c = context();
    expect(
      createRecordWithdrawal(c.dependencies)({ accountId: 'A1', amount: 50000 })
    ).toMatchObject({ type: 'WITHDRAWAL', amount: 50000 });
  });
});
