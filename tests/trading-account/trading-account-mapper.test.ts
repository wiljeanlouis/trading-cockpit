import { describe, expect, it } from 'vitest';
import {
  TRADING_ACCOUNT_HEADERS,
  tradingAccountFromRow,
  tradingAccountRiskPolicyFromRow
} from '../../src/adapters/outbound/google-sheets/trading-account-mapper';

describe('Trading Account mapper', () => {
  it('maps the three-column Accounts schema', () => {
    expect(
      tradingAccountFromRow([...TRADING_ACCOUNT_HEADERS], [' a1 ', ' Primary ', ' cad '])
    ).toEqual({
      id: 'A1',
      name: 'Primary',
      baseCurrency: 'CAD'
    });
  });

  it('requires every Accounts header', () => {
    expect(() => tradingAccountFromRow(['Account ID'], ['A1'])).toThrow('Colonne absente : Name');
  });

  it('maps independent optional account risk policies', () => {
    expect(
      tradingAccountRiskPolicyFromRow([...TRADING_ACCOUNT_HEADERS], ['A1', 'One', 'CAD', 0.005])
    ).toEqual({
      accountId: 'A1',
      riskPercentPerTrade: 0.005
    });
    expect(
      tradingAccountRiskPolicyFromRow([...TRADING_ACCOUNT_HEADERS], ['A2', 'Two', 'USD', ''])
    ).toBeNull();
  });
});
