import { describe, expect, it } from 'vitest';
import {
  TRADING_ACCOUNT_HEADERS,
  tradingAccountFromRow
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
});
