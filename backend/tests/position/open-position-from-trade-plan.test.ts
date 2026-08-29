import { describe, expect, it } from 'vitest';
import {
  createOpenPositionFromTradePlan,
  type OpenPositionFromTradePlanDependencies
} from '../../src/core/application/position/open-position-from-trade-plan';
import type { Position } from '../../src/core/domain/position';
import type { TradePlan } from '../../src/core/domain/trade-plan';

const tradePlan: TradePlan = {
  id: 'TP-1',
  accountId: 'A1',
  watchlistId: 'WL-1',
  strategyId: 'STRATEGY',
  strategyName: 'Strategy',
  strategyVersion: 'V1',
  signalDate: '',
  signalPrice: 100,
  ticker: 'BOX',
  referencePrice: 100,
  momentumScore: 80,
  setupStatus: 'READY',
  breakoutLevel: 100,
  invalidationLevel: 95,
  eventRisk: '',
  createdAt: new Date(),
  entryType: 'BREAKOUT',
  entryPrice: 100,
  stopPrice: 95,
  targetPrice: 110,
  riskPerShare: 5,
  rewardPerShare: 10,
  riskReward: 2,
  accountEquity: 10_000,
  riskPercent: 0.01,
  maxRisk: 100,
  positionSize: 20,
  positionValue: 2_000,
  status: 'READY',
  notes: ''
};

function context(plan: TradePlan | null = tradePlan, existing: Position | null = null) {
  const calls: string[] = [];
  let saved: Position | null = null;
  const dependencies: OpenPositionFromTradePlanDependencies = {
    positionRepository: {
      findById: () => null,
      findOpenByTradePlanId: () => existing,
      save: (position) => {
        calls.push('position.save');
        saved = position;
      },
      close: () => undefined
    },
    tradePlanRepository: {
      findById: () => plan,
      findActiveByWatchlistIdAndAccountId: () => null,
      save: () => undefined,
      updatePlanning: () => undefined,
      updateStatus: () => calls.push('tradePlan.update')
    },
    watchlistRepository: {
      findById: () => null,
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateTradePlanningInputs: () => undefined,
      updateStatus: () => calls.push('watchlist.update')
    },
    strategyRepository: { existsById: () => true },
    runtime: { now: () => new Date('2026-08-27T14:00:00Z'), newId: () => 'P-1' }
  };
  return { dependencies, calls, saved: () => saved };
}

describe('open Position from account-owned Trade Plan', () => {
  it('derives Position account ownership from the Trade Plan', () => {
    const c = context();
    const result = createOpenPositionFromTradePlan(c.dependencies)({ tradePlanId: 'TP-1' });
    expect(result.kind).toBe('opened');
    expect(c.saved()).toMatchObject({ accountId: 'A1', tradePlanId: 'TP-1' });
    expect(c.calls).toEqual(['position.save', 'tradePlan.update', 'watchlist.update']);
  });

  it('allows the same ticker in another account only through a distinct plan', () => {
    const c = context({ ...tradePlan, id: 'TP-2', accountId: 'A2' });
    const result = createOpenPositionFromTradePlan(c.dependencies)({ tradePlanId: 'TP-2' });
    expect(result.kind === 'opened' && result.position.accountId).toBe('A2');
  });

  it('blocks historical Trade Plans without Account ID', () => {
    const c = context({ ...tradePlan, accountId: '' });
    expect(() => createOpenPositionFromTradePlan(c.dependencies)({ tradePlanId: 'TP-1' })).toThrow(
      'Account ID absent sur le Trade Plan.'
    );
    expect(c.saved()).toBeNull();
  });

  it('rejects missing and unknown Trade Plan IDs', () => {
    const c = context(null);
    const open = createOpenPositionFromTradePlan(c.dependencies);
    expect(() => open({ tradePlanId: '' })).toThrow('Trade Plan ID absent.');
    expect(() => open({ tradePlanId: 'TP-404' })).toThrow('Trade Plan ID introuvable : TP-404');
  });

  it('keeps sequential retry idempotence by Trade Plan ID', () => {
    const first = context();
    const opened = createOpenPositionFromTradePlan(first.dependencies)({ tradePlanId: 'TP-1' });
    const position = opened.kind === 'opened' ? opened.position : null;
    const retry = context(tradePlan, position);
    expect(createOpenPositionFromTradePlan(retry.dependencies)({ tradePlanId: 'TP-1' }).kind).toBe(
      'duplicate'
    );
    expect(retry.saved()).toBeNull();
  });
});
