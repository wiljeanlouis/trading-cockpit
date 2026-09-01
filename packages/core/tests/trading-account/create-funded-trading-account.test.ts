import { describe, expect, it } from 'vitest';
import { createCreateFundedTradingAccount } from '@trading-cockpit/core/application/trading-account/create-funded-trading-account';
import type { CapitalTransaction } from '@trading-cockpit/core/domain/capital-transaction';
import type { TradingAccountRecord } from '@trading-cockpit/core/domain/trading-account';
import type {
  TradingAccountManagementRepository,
  TradingAccountReferenceSummary
} from '@trading-cockpit/core/ports/outbound/trading-account-management-repository';

class InMemoryTradingAccountManagementRepository implements TradingAccountManagementRepository {
  accounts: TradingAccountRecord[] = [];
  transactions: CapitalTransaction[] = [];
  failCreateFunded = false;

  findById(accountId: string): TradingAccountRecord | null {
    const expected = accountId.trim().toUpperCase();
    return this.accounts.find((account) => account.id === expected) ?? null;
  }

  create(account: TradingAccountRecord): void {
    this.accounts.push(account);
  }

  createFunded(account: TradingAccountRecord, initialFunding: CapitalTransaction): void {
    if (this.failCreateFunded) throw new Error('write failed');
    this.accounts.push(account);
    this.transactions.push(initialFunding);
  }

  update(account: TradingAccountRecord): void {
    this.accounts = this.accounts.map((candidate) =>
      candidate.id === account.id ? account : candidate
    );
  }

  countReferences(): TradingAccountReferenceSummary {
    return {
      tradePlans: 0,
      positions: 0,
      journalEntries: 0,
      capitalTransactions: 0
    };
  }
}

function useCase(repository = new InMemoryTradingAccountManagementRepository()) {
  return {
    repository,
    createFundedAccount: createCreateFundedTradingAccount({
      repository,
      runtime: {
        newId: () => 'CL-1',
        now: () => new Date('2026-09-01T12:00:00.000Z')
      }
    })
  };
}

describe('create funded trading account', () => {
  it('creates a trading account and exactly one initial funding transaction', () => {
    const { repository, createFundedAccount } = useCase();

    expect(
      createFundedAccount({
        accountId: ' a1 ',
        name: ' Main ',
        baseCurrency: ' usd ',
        riskPercentPerTrade: 0.005,
        initialAmount: 10_000
      })
    ).toEqual({
      id: 'A1',
      name: 'Main',
      baseCurrency: 'USD',
      riskPercentPerTrade: 0.005
    });

    expect(repository.accounts).toHaveLength(1);
    expect(repository.transactions).toEqual([
      {
        id: 'CL-1',
        accountId: 'A1',
        type: 'INITIAL_FUNDING',
        amount: 10_000,
        occurredAt: new Date('2026-09-01T12:00:00.000Z'),
        note: 'Initial funding'
      }
    ]);
  });

  it('rejects missing or non-positive initial funding', () => {
    const { createFundedAccount } = useCase();

    expect(() =>
      createFundedAccount({
        accountId: 'A1',
        name: 'Main',
        baseCurrency: 'USD',
        riskPercentPerTrade: 0.005,
        initialAmount: 0
      })
    ).toThrow('Initial Amount doit être supérieur à 0');
  });

  it('rejects duplicate accounts before recording initial funding', () => {
    const { repository, createFundedAccount } = useCase();

    createFundedAccount({
      accountId: 'A1',
      name: 'Main',
      baseCurrency: 'USD',
      riskPercentPerTrade: 0.005,
      initialAmount: 10_000
    });

    expect(() =>
      createFundedAccount({
        accountId: 'A1',
        name: 'Duplicate',
        baseCurrency: 'USD',
        riskPercentPerTrade: 0.005,
        initialAmount: 5_000
      })
    ).toThrow('Trading Account existe déjà');
    expect(repository.transactions).toHaveLength(1);
  });

  it('does not persist a partial account if the composite repository write fails', () => {
    const repository = new InMemoryTradingAccountManagementRepository();
    repository.failCreateFunded = true;
    const { createFundedAccount } = useCase(repository);

    expect(() =>
      createFundedAccount({
        accountId: 'A1',
        name: 'Main',
        baseCurrency: 'USD',
        riskPercentPerTrade: 0.005,
        initialAmount: 10_000
      })
    ).toThrow('write failed');

    expect(repository.accounts).toHaveLength(0);
    expect(repository.transactions).toHaveLength(0);
  });
});
