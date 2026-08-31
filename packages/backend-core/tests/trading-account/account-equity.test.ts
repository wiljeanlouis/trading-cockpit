import { describe, expect, it } from 'vitest';
import { createGetAccountEquity } from '@trading-cockpit/backend-core/application/trading-account/get-account-equity';
import {
  calculateRealizedPnl,
  createAccountEquitySummary
} from '@trading-cockpit/backend-core/domain/account-equity';
import {
  summarizeExternalCapital,
  type CapitalTransaction
} from '@trading-cockpit/backend-core/domain/capital-transaction';
import type { JournalEntry } from '@trading-cockpit/backend-core/domain/journal-entry';

const at = new Date('2026-08-27T12:00:00Z');
function transaction(
  accountId: string,
  type: CapitalTransaction['type'],
  amount: number
): CapitalTransaction {
  return {
    id: `${accountId}-${type}-${amount}`,
    accountId,
    type,
    amount,
    occurredAt: at,
    note: ''
  };
}
function journal(
  accountId: string,
  id: string,
  realizedPnl: JournalEntry['realizedPnl']
): JournalEntry {
  return { id, accountId, realizedPnl } as JournalEntry;
}
function useCase(accountId: string, transactions: CapitalTransaction[], entries: JournalEntry[]) {
  return createGetAccountEquity({
    tradingAccountRepository: {
      findById: (id) =>
        id === accountId ? { id, name: id, baseCurrency: id === 'A2' ? 'USD' : 'CAD' } : null,
      findAll: () => []
    },
    capitalTransactionRepository: { save: () => undefined, findByAccountId: () => transactions },
    journalRepository: {
      findByPositionId: () => null,
      findAllByPositionId: () => [],
      save: () => undefined,
      findClosedByAccountId: () => entries
    }
  });
}

describe('account realized equity', () => {
  it('calculates A1 10,000 external capital plus 500 P&L', () => {
    const get = useCase(
      'A1',
      [transaction('A1', 'INITIAL_FUNDING', 10_000)],
      [journal('A1', 'J1', 500)]
    );
    expect(get('A1')).toEqual({
      accountId: 'A1',
      baseCurrency: 'CAD',
      netExternalCapital: 10_000,
      realizedPnl: 500,
      realizedEquity: 10_500,
      basis: 'REALIZED',
      markToMarketEquity: null
    });
  });

  it('calculates A2 5,000 external capital minus 200 P&L', () => {
    const get = useCase(
      'A2',
      [transaction('A2', 'INITIAL_FUNDING', 5_000)],
      [journal('A2', 'J2', -200)]
    );
    expect(get('A2')).toMatchObject({
      baseCurrency: 'USD',
      realizedPnl: -200,
      realizedEquity: 4_800
    });
  });

  it('keeps deposits and withdrawals distinct from P&L', () => {
    const capital = summarizeExternalCapital('A1', 'CAD', [
      transaction('A1', 'INITIAL_FUNDING', 10_000),
      transaction('A1', 'DEPOSIT', 2_000),
      transaction('A1', 'WITHDRAWAL', 1_000)
    ]);
    expect(createAccountEquitySummary(capital, [journal('A1', 'J1', 500)])).toMatchObject({
      netExternalCapital: 11_000,
      realizedPnl: 500,
      realizedEquity: 11_500
    });
  });

  it('sums multiple Journal snapshots exactly once', () => {
    expect(calculateRealizedPnl([journal('A1', 'J1', 500), journal('A1', 'J2', -125)])).toBe(375);
  });

  it('uses zero realized P&L when no closed trades exist', () => {
    const get = useCase('A1', [transaction('A1', 'INITIAL_FUNDING', 10_000)], []);
    expect(get('A1').realizedEquity).toBe(10_000);
  });

  it('does not manufacture mark-to-market equity', () => {
    const get = useCase('A1', [transaction('A1', 'INITIAL_FUNDING', 10_000)], []);
    expect(get('A1').markToMarketEquity).toBeNull();
  });

  it('rejects absent Journal realized P&L', () => {
    expect(() => calculateRealizedPnl([journal('A1', 'J1', '')])).toThrow('Realized P&L absent');
  });

  it('rejects non-numeric Journal realized P&L', () => {
    expect(() => calculateRealizedPnl([journal('A1', 'J1', 'bad')])).toThrow(
      'Realized P&L invalide'
    );
  });

  it('rejects non-positive derived equity', () => {
    const capital = summarizeExternalCapital('A1', 'CAD', [
      transaction('A1', 'INITIAL_FUNDING', 100)
    ]);
    expect(() => createAccountEquitySummary(capital, [journal('A1', 'J1', -100)])).toThrow(
      'Equity réalisée invalide'
    );
  });

  it('validates missing Account ID before repositories', () => {
    const get = useCase('A1', [], []);
    expect(() => get('')).toThrow('Account ID absent.');
  });

  it('rejects unknown Trading Account', () => {
    const get = useCase('A1', [], []);
    expect(() => get('A404')).toThrow('Trading Account introuvable : A404');
  });

  it('requires explicit Initial Funding', () => {
    const get = useCase('A1', [transaction('A1', 'DEPOSIT', 1_000)], []);
    expect(() => get('A1')).toThrow('Initial Funding absent pour le compte A1.');
  });

  it('normalizes Account ID', () => {
    const get = useCase('A1', [transaction('A1', 'INITIAL_FUNDING', 100)], []);
    expect(get(' a1 ').accountId).toBe('A1');
  });

  it('preserves each account base currency without aggregation', () => {
    const a1 = useCase('A1', [transaction('A1', 'INITIAL_FUNDING', 100)], []);
    const a2 = useCase('A2', [transaction('A2', 'INITIAL_FUNDING', 100)], []);
    expect([a1('A1').baseCurrency, a2('A2').baseCurrency]).toEqual(['CAD', 'USD']);
  });
});
