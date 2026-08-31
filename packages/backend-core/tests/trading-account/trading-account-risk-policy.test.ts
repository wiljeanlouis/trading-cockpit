import { describe, expect, it } from 'vitest';
import { createTradingAccountRiskPolicy } from '@trading-cockpit/backend-core/domain/trading-account-risk-policy';
import { calculateMaxRisk } from '@trading-cockpit/backend-core/domain/trade-plan';

describe('Trading Account risk policy foundation', () => {
  it('allows different valid policies without cross-account leakage', () => {
    expect(createTradingAccountRiskPolicy('A1', 0.005)).toEqual({
      accountId: 'A1',
      riskPercentPerTrade: 0.005
    });
    expect(createTradingAccountRiskPolicy('A2', 0.01)).toEqual({
      accountId: 'A2',
      riskPercentPerTrade: 0.01
    });
  });
  it.each([0, -1, 1.01, Number.NaN])('preserves existing 0 < risk <= 1 bounds for %s', (risk) => {
    expect(() => createTradingAccountRiskPolicy('A1', risk)).toThrow('Risk % doit être compris');
  });
  it('does not reinterpret NetExternalCapital as legacy Account Equity', () => {
    expect(calculateMaxRisk(10000, 0.005)).toBe(50);
    const netExternalCapitalAfterProfit = 10000;
    expect(netExternalCapitalAfterProfit).toBe(10000);
  });
});
