import { describe, expect, it } from 'vitest';
import {
  normalizeTradingAccount,
  requireUniqueTradingAccountIds,
  type PortfolioScope
} from '../../src/core/domain/trading-account';

describe('Trading Account domain', () => {
  it('normalizes stable identity and explicit currency', () => {
    expect(
      normalizeTradingAccount({ id: ' a1 ', name: ' Primary ', baseCurrency: ' cad ' })
    ).toEqual({
      id: 'A1',
      name: 'Primary',
      baseCurrency: 'CAD'
    });
  });

  it.each([
    [{ id: '', name: 'Primary', baseCurrency: 'CAD' }, 'Account ID absent.'],
    [{ id: 'A1', name: '', baseCurrency: 'CAD' }, 'Account Name absent.'],
    [{ id: 'A1', name: 'Primary', baseCurrency: '' }, 'Base Currency absente.'],
    [{ id: 'ALL', name: 'All', baseCurrency: 'CAD' }, 'ALL est une portée de portefeuille']
  ])('rejects invalid persisted account %#', (account, message) => {
    expect(() => normalizeTradingAccount(account)).toThrow(message);
  });

  it('models ALL as query scope rather than a persisted account', () => {
    const scopes: PortfolioScope[] = [{ type: 'ALL' }, { type: 'ACCOUNT', accountId: 'A1' }];
    expect(scopes).toEqual([{ type: 'ALL' }, { type: 'ACCOUNT', accountId: 'A1' }]);
  });

  it('rejects ambiguous duplicate Account IDs', () => {
    expect(() =>
      requireUniqueTradingAccountIds([
        { id: 'A1', name: 'One', baseCurrency: 'CAD' },
        { id: 'A1', name: 'Duplicate', baseCurrency: 'USD' }
      ])
    ).toThrow('Trading Account ID dupliqué : A1');
  });
});
