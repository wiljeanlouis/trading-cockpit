import { describe, expect, it } from 'vitest';
import {
  createCreateTradePlanFromWatchlist,
  type CreateTradePlanFromWatchlistDependencies
} from '../../src/core/application/trade-plan/create-trade-plan-from-watchlist';
import type { TradePlan } from '../../src/core/domain/trade-plan';
import type { WatchlistEntry } from '../../src/core/domain/watchlist';

const watchlistEntry: WatchlistEntry = {
  id: 'WL-1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  signalDate: '2026-08-27',
  ticker: 'urnb',
  company: 'Urban Outfitters',
  sector: 'Consumer Cyclical',
  addedAt: new Date('2026-08-27T13:00:00.000Z'),
  signalPrice: 54.25,
  currentPrice: 56.5,
  momentumScore: 88,
  status: 'WATCHING',
  setupStatus: 'READY',
  breakoutLevel: 57,
  invalidationLevel: 52,
  earningsDate: '',
  eventRisk: 'LOW',
  notes: '',
  closedAt: ''
};

const existingTradePlan: TradePlan = {
  id: 'TP-OLD',
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
  createdAt: new Date('2026-08-27T13:30:00.000Z'),
  entryType: 'BREAKOUT',
  entryPrice: '',
  stopPrice: 52,
  targetPrice: '',
  riskPerShare: null,
  rewardPerShare: null,
  riskReward: null,
  accountEquity: 10_000,
  riskPercent: 0.005,
  maxRisk: 50,
  positionSize: null,
  positionValue: null,
  status: 'DRAFT',
  notes: ''
};

function createDependencies(options?: {
  watchlistEntry?: WatchlistEntry | null;
  existingTradePlan?: TradePlan | null;
  configuration?: { accountEquity: number; riskPercent: number };
}) {
  const calls: string[] = [];
  let saved: TradePlan | null = null;
  let statusUpdate: { id: string; status: string } | null = null;

  const dependencies: CreateTradePlanFromWatchlistDependencies = {
    watchlistRepository: {
      findById: (id) => {
        calls.push(`watchlist.find:${id}`);
        return options?.watchlistEntry === undefined ? watchlistEntry : options.watchlistEntry;
      },
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateStatus: (id, status) => {
        calls.push('watchlist.update');
        statusUpdate = { id, status };
      }
    },
    tradePlanRepository: {
      findById: () => null,
      findActiveByWatchlistId: () => {
        calls.push('tradePlan.find');
        return options?.existingTradePlan ?? null;
      },
      save: (tradePlan) => {
        calls.push('tradePlan.save');
        saved = tradePlan;
      },
      updateStatus: () => undefined
    },
    strategyRepository: {
      existsById: () => {
        calls.push('strategy.exists');
        return true;
      }
    },
    tradingConfiguration: {
      getRiskConfiguration: () => {
        calls.push('configuration.get');
        return options?.configuration ?? { accountEquity: 10_000, riskPercent: 0.005 };
      }
    },
    runtime: {
      newId: () => {
        calls.push('runtime.newId');
        return 'TP-1';
      },
      now: () => {
        calls.push('runtime.now');
        return new Date('2026-08-27T14:00:00.000Z');
      }
    }
  };

  return {
    dependencies,
    calls,
    saved: () => saved,
    statusUpdate: () => statusUpdate
  };
}

describe('create Trade Plan from Watchlist', () => {
  it('creates, saves, then marks Watchlist PLANNED in exact legacy order', () => {
    const context = createDependencies();
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    const result = createTradePlan({ watchlistId: ' WL-1 ' });

    expect(result.kind).toBe('created');
    expect(context.calls).toEqual([
      'watchlist.find:WL-1',
      'strategy.exists',
      'tradePlan.find',
      'runtime.newId',
      'runtime.now',
      'configuration.get',
      'tradePlan.save',
      'watchlist.update'
    ]);
    expect(context.saved()).toMatchObject({
      id: 'TP-1',
      watchlistId: 'WL-1',
      ticker: 'URNB',
      stopPrice: 52,
      maxRisk: 50,
      status: 'DRAFT'
    });
    expect(context.statusUpdate()).toEqual({ id: 'WL-1', status: 'PLANNED' });
  });

  it('rejects a missing Watchlist before any port call', () => {
    const context = createDependencies();
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: '' })).toThrow('Watchlist ID absent.');
    expect(context.calls).toEqual([]);
  });

  it('rejects a Watchlist ID that the repository cannot find', () => {
    const context = createDependencies({ watchlistEntry: null });
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-404' })).toThrow(
      'Watchlist ID introuvable : WL-404'
    );
    expect(context.calls).toEqual(['watchlist.find:WL-404']);
  });

  it('preserves legacy behavior by accepting a terminal or unknown Watchlist status', () => {
    const context = createDependencies({
      watchlistEntry: { ...watchlistEntry, status: 'REJECTED' }
    });
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(createTradePlan({ watchlistId: 'WL-1' }).kind).toBe('created');
  });

  it('returns duplicate before consuming runtime or configuration', () => {
    const context = createDependencies({ existingTradePlan });
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(createTradePlan({ watchlistId: 'WL-1' })).toEqual({
      kind: 'duplicate',
      watchlistId: 'WL-1',
      ticker: 'urnb',
      existing: existingTradePlan
    });
    expect(context.calls).toEqual(['watchlist.find:WL-1', 'strategy.exists', 'tradePlan.find']);
  });

  it('rejects missing invalidation before opening Trade Plans', () => {
    const context = createDependencies({
      watchlistEntry: { ...watchlistEntry, invalidationLevel: '' }
    });
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-1' })).toThrow(
      "URNB n'a pas encore d'Invalidation Level. Définis-le avant de créer un Trade Plan."
    );
    expect(context.calls).toEqual(['watchlist.find:WL-1', 'strategy.exists']);
  });

  it('rejects unknown Strategy before validating invalidation', () => {
    const context = createDependencies({
      watchlistEntry: { ...watchlistEntry, invalidationLevel: '' }
    });
    context.dependencies.strategyRepository.existsById = () => false;
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-1' })).toThrow(
      'Stratégie inconnue : MOMENTUM_BREAKOUT'
    );
  });

  it('rejects invalid configuration after consuming UUID and timestamp but before saving', () => {
    const context = createDependencies({ configuration: { accountEquity: 0, riskPercent: 0 } });
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-1' })).toThrow(
      'Account Equity doit être supérieur à 0.'
    );
    expect(context.calls).toEqual([
      'watchlist.find:WL-1',
      'strategy.exists',
      'tradePlan.find',
      'runtime.newId',
      'runtime.now',
      'configuration.get'
    ]);
    expect(context.saved()).toBeNull();
    expect(context.statusUpdate()).toBeNull();
  });

  it('leaves Watchlist unchanged if Trade Plan save fails', () => {
    const context = createDependencies();
    context.dependencies.tradePlanRepository.save = () => {
      throw new Error('save failed');
    };
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-1' })).toThrow('save failed');
    expect(context.statusUpdate()).toBeNull();
  });

  it('exposes the legacy partial-failure risk when Watchlist update fails after save', () => {
    const context = createDependencies();
    context.dependencies.watchlistRepository.updateStatus = () => {
      throw new Error('update failed');
    };
    const createTradePlan = createCreateTradePlanFromWatchlist(context.dependencies);

    expect(() => createTradePlan({ watchlistId: 'WL-1' })).toThrow('update failed');
    expect(context.saved()).not.toBeNull();
  });
});
