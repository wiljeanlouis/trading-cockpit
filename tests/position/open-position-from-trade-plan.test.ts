import { describe, expect, it } from 'vitest';
import {
  createOpenPositionFromTradePlan,
  type OpenPositionFromTradePlanDependencies
} from '../../src/core/application/position/open-position-from-trade-plan';
import type { Position } from '../../src/core/domain/position';
import type { TradePlan } from '../../src/core/domain/trade-plan';

const tradePlan: TradePlan = {
  id: 'TP-1',
  watchlistId: 'WL-1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  signalDate: '2026-08-27',
  signalPrice: 54.25,
  ticker: 'URNB',
  referencePrice: 56.5,
  momentumScore: 88,
  setupStatus: 'READY',
  breakoutLevel: 57,
  invalidationLevel: 52,
  eventRisk: 'LOW',
  createdAt: new Date('2026-08-27T13:00:00.000Z'),
  entryType: 'BREAKOUT',
  entryPrice: 57,
  stopPrice: 52,
  targetPrice: 67,
  riskPerShare: 5,
  rewardPerShare: 10,
  riskReward: 2,
  accountEquity: 10_000,
  riskPercent: 0.005,
  maxRisk: 50,
  positionSize: 10,
  positionValue: 570,
  status: 'READY',
  notes: ''
};

const existingPosition: Position = {
  id: 'P-OLD',
  accountId: 'A1',
  tradePlanId: 'TP-1',
  watchlistId: 'WL-1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  ticker: 'URNB',
  openedAt: new Date('2026-08-27T13:30:00.000Z'),
  plannedEntry: 57,
  actualEntry: 57,
  plannedQuantity: 10,
  actualQuantity: 10,
  initialStop: 52,
  currentStop: 52,
  target: 67,
  plannedMaxRisk: 50,
  plannedRiskReward: 2,
  currentPrice: 58,
  unrealizedPnl: 10,
  unrealizedPnlPercent: 0.0175,
  status: 'OPEN',
  closedAt: '',
  exitPrice: '',
  realizedPnl: '',
  notes: ''
};

function createDependencies(options?: {
  tradePlan?: TradePlan | null;
  existingPosition?: Position | null;
}) {
  const calls: string[] = [];
  let saved: Position | null = null;
  const tradePlanUpdates: Array<{ id: string; status: string }> = [];
  const watchlistUpdates: Array<{ id: string; status: string }> = [];

  const dependencies: OpenPositionFromTradePlanDependencies = {
    tradingAccountRepository: {
      findById: (id) => {
        calls.push(`account.find:${id}`);
        return ['A1', 'A2'].includes(id) ? { id, name: id, baseCurrency: 'CAD' } : null;
      },
      findAll: () => []
    },
    positionRepository: {
      findById: () => null,
      findOpenByTradePlanId: () => {
        calls.push('position.find');
        return options?.existingPosition ?? null;
      },
      save: (position) => {
        calls.push('position.save');
        saved = position;
      },
      close: () => undefined
    },
    tradePlanRepository: {
      findById: (id) => {
        calls.push(`tradePlan.find:${id}`);
        return options?.tradePlan === undefined ? tradePlan : options.tradePlan;
      },
      findActiveByWatchlistId: () => null,
      save: () => undefined,
      updateStatus: (id, status) => {
        calls.push('tradePlan.update');
        tradePlanUpdates.push({ id, status });
      }
    },
    watchlistRepository: {
      findById: () => null,
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateStatus: (id, status) => {
        calls.push('watchlist.update');
        watchlistUpdates.push({ id, status });
      }
    },
    strategyRepository: {
      existsById: () => {
        calls.push('strategy.exists');
        return true;
      }
    },
    runtime: {
      now: () => {
        calls.push('runtime.now');
        return new Date('2026-08-27T14:00:00.000Z');
      },
      newId: () => {
        calls.push('runtime.newId');
        return 'P-1';
      }
    }
  };

  return {
    dependencies,
    calls,
    saved: () => saved,
    tradePlanUpdates,
    watchlistUpdates
  };
}

describe('open Position from Trade Plan', () => {
  it('allows the same ticker in different accounts through distinct single-execution plans', () => {
    const first = createDependencies();
    const second = createDependencies({ tradePlan: { ...tradePlan, id: 'TP-2' } });

    const firstResult = createOpenPositionFromTradePlan(first.dependencies)({
      tradePlanId: 'TP-1',
      accountId: 'A1'
    });
    const secondResult = createOpenPositionFromTradePlan(second.dependencies)({
      tradePlanId: 'TP-2',
      accountId: 'A2'
    });

    expect(firstResult.kind === 'opened' && firstResult.position).toMatchObject({
      accountId: 'A1',
      ticker: 'URNB'
    });
    expect(secondResult.kind === 'opened' && secondResult.position).toMatchObject({
      accountId: 'A2',
      ticker: 'URNB'
    });
  });
  it('requires an Account ID before loading the Trade Plan', () => {
    const context = createDependencies();
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);
    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: '' })).toThrow(
      'Account ID absent.'
    );
    expect(context.calls).toEqual([]);
  });

  it('rejects an unknown Trading Account without creating Position', () => {
    const context = createDependencies();
    context.dependencies.tradingAccountRepository.findById = () => null;
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);
    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A404' })).toThrow(
      'Trading Account introuvable : A404'
    );
    expect(context.calls).not.toContain('position.save');
  });
  it('opens Position then updates Trade Plan and Watchlist in exact legacy order', () => {
    const context = createDependencies();
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    const result = openPosition({ tradePlanId: ' TP-1 ', accountId: 'A1' });

    expect(result.kind).toBe('opened');
    expect(context.calls).toEqual([
      'tradePlan.find:TP-1',
      'strategy.exists',
      'account.find:A1',
      'position.find',
      'runtime.now',
      'runtime.newId',
      'position.save',
      'tradePlan.update',
      'watchlist.update'
    ]);
    expect(context.saved()).toMatchObject({
      id: 'P-1',
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      ticker: 'URNB',
      plannedEntry: 57,
      actualEntry: 57,
      plannedQuantity: 10,
      actualQuantity: 10,
      status: 'OPEN'
    });
    expect(context.tradePlanUpdates).toEqual([{ id: 'TP-1', status: 'EXECUTED' }]);
    expect(context.watchlistUpdates).toEqual([{ id: 'WL-1', status: 'ENTERED' }]);
  });

  it('rejects missing Trade Plan ID before any port call', () => {
    const context = createDependencies();
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: '', accountId: 'A1' })).toThrow(
      'Trade Plan ID absent.'
    );
    expect(context.calls).toEqual([]);
  });

  it('rejects an unknown Trade Plan', () => {
    const context = createDependencies({ tradePlan: null });
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: 'TP-404', accountId: 'A1' })).toThrow(
      'Trade Plan ID introuvable : TP-404'
    );
    expect(context.calls).toEqual(['tradePlan.find:TP-404']);
  });

  it.each(['EXECUTED', 'CANCELLED', 'UNKNOWN'])(
    'rejects non-executable Trade Plan status %s before opening Positions',
    (status) => {
      const context = createDependencies({ tradePlan: { ...tradePlan, status } });
      const openPosition = createOpenPositionFromTradePlan(context.dependencies);

      expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toThrow();
      expect(context.calls).toEqual(['tradePlan.find:TP-1', 'strategy.exists']);
    }
  );

  it.each([
    ['entryPrice', ''],
    ['stopPrice', ''],
    ['positionSize', ''],
    ['positionSize', 0],
    ['positionSize', -1]
  ] as const)('rejects missing or invalid execution data %s=%s', (field, value) => {
    const context = createDependencies({ tradePlan: { ...tradePlan, [field]: value } });
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toThrow();
    expect(context.calls).toEqual(['tradePlan.find:TP-1', 'strategy.exists']);
  });

  it('preserves zero and negative Actual Entry because legacy accepts them', () => {
    const context = createDependencies({ tradePlan: { ...tradePlan, entryPrice: 0 } });
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(openPosition({ tradePlanId: 'TP-1', accountId: 'A1' }).kind).toBe('opened');
    expect(context.saved()).toMatchObject({ actualEntry: 0 });
  });

  it('returns duplicate without consuming runtime or mutating statuses', () => {
    const context = createDependencies({ existingPosition });
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toEqual({
      kind: 'duplicate',
      tradePlanId: 'TP-1',
      ticker: 'URNB',
      existing: existingPosition
    });
    expect(context.calls).toEqual([
      'tradePlan.find:TP-1',
      'strategy.exists',
      'account.find:A1',
      'position.find'
    ]);
    expect(context.tradePlanUpdates).toEqual([]);
    expect(context.watchlistUpdates).toEqual([]);
  });

  it('leaves both statuses unchanged if Position save fails', () => {
    const context = createDependencies();
    context.dependencies.positionRepository.save = () => {
      throw new Error('save failed');
    };
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toThrow('save failed');
    expect(context.tradePlanUpdates).toEqual([]);
    expect(context.watchlistUpdates).toEqual([]);
  });

  it('exposes an OPEN Position if Trade Plan status update fails after save', () => {
    const context = createDependencies();
    context.dependencies.tradePlanRepository.updateStatus = () => {
      throw new Error('trade plan update failed');
    };
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toThrow(
      'trade plan update failed'
    );
    expect(context.saved()).not.toBeNull();
    expect(context.watchlistUpdates).toEqual([]);
  });

  it('exposes Position and EXECUTED plan if Watchlist update fails', () => {
    const context = createDependencies();
    context.dependencies.watchlistRepository.updateStatus = () => {
      throw new Error('watchlist update failed');
    };
    const openPosition = createOpenPositionFromTradePlan(context.dependencies);

    expect(() => openPosition({ tradePlanId: 'TP-1', accountId: 'A1' })).toThrow(
      'watchlist update failed'
    );
    expect(context.saved()).not.toBeNull();
    expect(context.tradePlanUpdates).toEqual([{ id: 'TP-1', status: 'EXECUTED' }]);
  });

  it('prevents double execution when retry sees the existing OPEN Position', () => {
    const first = createDependencies();
    const openFirst = createOpenPositionFromTradePlan(first.dependencies);
    const firstResult = openFirst({ tradePlanId: 'TP-1', accountId: 'A1' });
    const opened = firstResult.kind === 'opened' ? firstResult.position : null;
    const retry = createDependencies({ existingPosition: opened });
    const openRetry = createOpenPositionFromTradePlan(retry.dependencies);

    expect(openRetry({ tradePlanId: 'TP-1', accountId: 'A1' }).kind).toBe('duplicate');
    expect(retry.calls).not.toContain('position.save');
  });
});
