import { describe, expect, it, vi } from 'vitest';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';
import { createGetTradePlans } from '@trading-cockpit/core/application/trade-plan/get-trade-plans';

const plan: TradePlan = {
  id: 'TP-1',
  accountId: 'A1',
  watchlistId: 'WL-1',
  strategyId: 'TRIGGER',
  strategyName: 'Breakout',
  strategyVersion: 'V1',
  signalDate: new Date('2026-08-27T04:00:00.000Z'),
  signalPrice: 33,
  ticker: 'BOX',
  referencePrice: 34,
  setupStatus: 'TRIGGERED',
  triggerLevel: 34.5,
  invalidationLevel: 32.8,
  eventRisk: 'CLEAR',
  createdAt: new Date('2026-08-28T14:00:00.000Z'),
  entryType: 'TRIGGER',
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
      strategyIds: () => ['TRIGGER'],
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
          strategyId: 'TRIGGER',
          strategyName: 'Breakout',
          strategyVersion: 'V1',
          signalDate: '2026-08-27T04:00:00.000Z',
          signalPrice: 33,
          referencePrice: 34,
          setupStatus: 'TRIGGERED',
          triggerLevel: 34.5,
          invalidationLevel: 32.8,
          eventRisk: 'CLEAR',
          createdAt: '2026-08-28T14:00:00.000Z',
          entryType: 'TRIGGER',
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
          executionEligibility: {
            eligible: true,
            code: 'ELIGIBLE',
            message: null,
            reason: null,
            details: null
          }
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
      strategyIds: () => ['TRIGGER'],
      now: () => new Date()
    })();

    expect(result.items[0]).toMatchObject({
      entryPrice: null,
      riskPerShare: null,
      positionSize: null,
      accountEquity: null,
      riskPercent: null,
      executionEligibility: {
        eligible: false,
        code: 'PLAN_INCOMPLETE',
        message: "BOX n'a pas d'Entry Price.",
        reason: "BOX n'a pas d'Entry Price.",
        details: null
      }
    });
  });

  it('loads configured Strategy IDs once for multiple Trade Plans', () => {
    const findAllPlans = vi.fn(() => [
      plan,
      { ...plan, id: 'TP-2', ticker: 'URBN' },
      { ...plan, id: 'TP-3', ticker: 'DK' }
    ]);
    const strategyIds = vi.fn(() => ['TRIGGER']);

    const result = createGetTradePlans({
      reader: { findAll: findAllPlans },
      strategyIds,
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(findAllPlans).toHaveBeenCalledTimes(1);
    expect(strategyIds).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.executionEligibility)).toEqual([
      { eligible: true, code: 'ELIGIBLE', message: null, reason: null, details: null },
      { eligible: true, code: 'ELIGIBLE', message: null, reason: null, details: null },
      { eligible: true, code: 'ELIGIBLE', message: null, reason: null, details: null }
    ]);
  });

  it('marks execution ineligible when the historical Strategy Version is not configured', () => {
    const result = createGetTradePlans({
      reader: { findAll: () => [plan] },
      strategyIds: () => ['TRIGGER'],
      strategyVersions: () => [{ strategyId: 'TRIGGER', version: 'V2' }],
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.items[0].executionEligibility).toEqual({
      eligible: false,
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'Version de stratégie inconnue : TRIGGER V1',
      details: null,
      reason: 'Version de stratégie inconnue : TRIGGER V1'
    });
  });

  it('preserves Strategy lookup failures as execution eligibility reasons', () => {
    const result = createGetTradePlans({
      reader: { findAll: () => [plan] },
      strategyIds: () => {
        throw new Error('Aucune stratégie configurée.');
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.items[0].executionEligibility).toEqual({
      eligible: false,
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'Aucune stratégie configurée.',
      details: null,
      reason: 'Aucune stratégie configurée.'
    });
  });

  it('marks a complete non-triggered setup as not executable', () => {
    const result = createGetTradePlans({
      reader: { findAll: () => [{ ...plan, setupStatus: 'WAITING_FOR_TRIGGER', status: 'DRAFT' }] },
      strategyIds: () => ['TRIGGER'],
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.items[0].executionEligibility).toMatchObject({
      eligible: false,
      code: 'SETUP_NOT_TRIGGERED'
    });
  });
});
