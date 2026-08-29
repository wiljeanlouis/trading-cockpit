import { describe, expect, it } from 'vitest';
import type { TradePlan } from '../../src/core/domain/trade-plan';
import { createGetTradePlans } from '../../src/core/application/trade-plan/get-trade-plans';

const plan: TradePlan = {
  id: 'TP-1',
  accountId: 'A1',
  watchlistId: 'WL-1',
  strategyId: 'BREAKOUT',
  strategyName: 'Breakout',
  strategyVersion: 'V1',
  signalDate: new Date('2026-08-27T04:00:00.000Z'),
  signalPrice: 33,
  ticker: 'BOX',
  referencePrice: 34,
  momentumScore: 87,
  setupStatus: 'CONFIRMED',
  breakoutLevel: 34.5,
  invalidationLevel: 32.8,
  eventRisk: 'CLEAR',
  createdAt: new Date('2026-08-28T14:00:00.000Z'),
  entryType: 'BREAKOUT',
  entryPrice: 35,
  stopPrice: 32.8,
  targetPrice: 40,
  riskPerShare: 2.2,
  rewardPerShare: 5,
  riskReward: 2.27,
  accountEquity: 10_000,
  riskPercent: 0.01,
  maxRisk: 100,
  positionSize: 45,
  positionValue: 1575,
  status: 'READY',
  notes: 'Wait for volume'
};

describe('get Trade Plans', () => {
  it('returns persisted financial snapshots without recalculating them', () => {
    const result = createGetTradePlans({
      reader: { findAll: () => [plan] },
      strategyRepository: { existsById: () => true },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result).toEqual({
      generatedAt: '2026-08-28T16:00:00.000Z',
      items: [
        {
          id: 'TP-1',
          watchlistId: 'WL-1',
          accountId: 'A1',
          ticker: 'BOX',
          strategyId: 'BREAKOUT',
          strategyName: 'Breakout',
          strategyVersion: 'V1',
          signalDate: '2026-08-27T04:00:00.000Z',
          signalPrice: 33,
          referencePrice: 34,
          momentumScore: 87,
          setupStatus: 'CONFIRMED',
          breakoutLevel: 34.5,
          invalidationLevel: 32.8,
          eventRisk: 'CLEAR',
          createdAt: '2026-08-28T14:00:00.000Z',
          entryType: 'BREAKOUT',
          entryPrice: 35,
          stopPrice: 32.8,
          targetPrice: 40,
          riskPerShare: 2.2,
          rewardPerShare: 5,
          riskReward: 2.27,
          accountEquity: 10_000,
          riskPercent: 0.01,
          maxRisk: 100,
          positionSize: 45,
          positionValue: 1575,
          status: 'READY',
          notes: 'Wait for volume',
          executionEligibility: { eligible: true, reason: null }
        }
      ]
    });
  });

  it('maps blank and formula-error values to null instead of financial numbers', () => {
    const result = createGetTradePlans({
      reader: {
        findAll: () => [
          {
            ...plan,
            entryPrice: '',
            riskPerShare: '#N/A',
            positionSize: '',
            accountEquity: 0,
            riskPercent: 0
          }
        ]
      },
      strategyRepository: { existsById: () => true },
      now: () => new Date()
    })();

    expect(result.items[0]).toMatchObject({
      entryPrice: null,
      riskPerShare: null,
      positionSize: null,
      accountEquity: null,
      riskPercent: null,
      executionEligibility: { eligible: false, reason: "BOX n'a pas d'Entry Price." }
    });
  });
});
