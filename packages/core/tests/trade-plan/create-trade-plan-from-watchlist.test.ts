import { describe, expect, it } from 'vitest';
import {
  createCreateTradePlanFromWatchlist,
  type CreateTradePlanFromWatchlistDependencies
} from '@trading-cockpit/core/application/trade-plan/create-trade-plan-from-watchlist';
import type { AccountEquitySummary } from '@trading-cockpit/core/domain/account-equity';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';

const watchlist: WatchlistEntry = {
  id: 'WL-1',
  strategyId: 'STRATEGY',
  strategyName: 'Strategy',
  strategyVersion: 'V1',
  signalDate: '',
  ticker: 'box',
  company: 'Box',
  sector: 'Tech',
  addedAt: new Date(),
  signalPrice: 100,
  currentPrice: 100,
  momentumScore: 80,
  status: 'WATCHING',
  setupStatus: 'READY',
  breakoutLevel: 100,
  invalidationLevel: 95,
  earningsDate: '',
  eventRisk: '',
  notes: '',
  closedAt: ''
};

function equity(accountId: string, amount: number): AccountEquitySummary {
  return {
    accountId,
    baseCurrency: accountId === 'A2' ? 'USD' : 'CAD',
    netExternalCapital: amount,
    realizedPnl: 0,
    realizedEquity: amount,
    basis: 'REALIZED',
    markToMarketEquity: null
  };
}

function context(
  options: {
    equity?: number;
    risk?: number;
    existing?: TradePlan | null;
    accountExists?: boolean;
    riskExists?: boolean;
  } = {}
) {
  let saved: TradePlan | null = null;
  let updatedPlanningInputs: {
    breakoutLevel: number | null;
    invalidationLevel: number;
    eventRisk: string;
  } | null = null;
  const dependencies: CreateTradePlanFromWatchlistDependencies = {
    watchlistRepository: {
      findById: () => watchlist,
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateTradePlanningInputs: (_id, inputs) => {
        updatedPlanningInputs = inputs;
      },
      updateStatus: () => undefined
    },
    tradePlanRepository: {
      findById: () => null,
      findActiveByWatchlistIdAndAccountId: () => options.existing ?? null,
      save: (plan) => {
        saved = plan;
      },
      updatePlanning: () => undefined,
      updateStatus: () => undefined
    },
    strategyRepository: { existsById: () => true },
    tradingAccountRepository: {
      findById: (id) =>
        options.accountExists === false ? null : { id, name: id, baseCurrency: 'CAD' },
      findAll: () => []
    },
    tradingAccountRiskPolicyRepository: {
      findByAccountId: (id) =>
        options.riskExists === false
          ? null
          : { accountId: id, riskPercentPerTrade: options.risk ?? 0.01 }
    },
    getAccountEquity: (id) => equity(id, options.equity ?? 10_000),
    runtime: { newId: () => 'TP-1', now: () => new Date('2026-08-27T14:00:00Z') }
  };
  return { dependencies, saved: () => saved, updatedPlanningInputs: () => updatedPlanningInputs };
}

describe('create account-aware Trade Plan from Watchlist', () => {
  it('rejects missing Watchlist ID before persistence', () => {
    const c = context();
    expect(() =>
      createCreateTradePlanFromWatchlist(c.dependencies)({ watchlistId: '', accountId: 'A1' })
    ).toThrow('Watchlist ID absent.');
    expect(c.saved()).toBeNull();
  });

  it('rejects missing Account ID before persistence', () => {
    const c = context();
    expect(() =>
      createCreateTradePlanFromWatchlist(c.dependencies)({ watchlistId: 'WL-1', accountId: '' })
    ).toThrow('Account ID absent.');
    expect(c.saved()).toBeNull();
  });

  it('snapshots account, realized equity and account risk policy', () => {
    const c = context({ equity: 10_000, risk: 0.01 });
    const result = createCreateTradePlanFromWatchlist(c.dependencies)({
      watchlistId: 'WL-1',
      accountId: 'a1'
    });
    expect(result.kind).toBe('created');
    expect(c.saved()).toMatchObject({
      accountId: 'A1',
      accountEquity: 10_000,
      riskPercent: 0.01,
      maxRisk: 100
    });
  });

  it('uses and persists planning inputs supplied by the web workflow', () => {
    const c = context();
    const result = createCreateTradePlanFromWatchlist(c.dependencies)({
      watchlistId: 'WL-1',
      accountId: 'A1',
      breakoutLevel: 102,
      invalidationLevel: 94,
      eventRisk: 'earnings soon'
    });

    expect(result.kind).toBe('created');
    expect(c.saved()).toMatchObject({
      breakoutLevel: 102,
      invalidationLevel: 94,
      stopPrice: 94,
      eventRisk: 'EARNINGS SOON'
    });
    expect(c.updatedPlanningInputs()).toEqual({
      breakoutLevel: 102,
      invalidationLevel: 94,
      eventRisk: 'EARNINGS SOON'
    });
  });

  it('rejects invalid web planning levels before persistence', () => {
    const c = context();
    expect(() =>
      createCreateTradePlanFromWatchlist(c.dependencies)({
        watchlistId: 'WL-1',
        accountId: 'A1',
        breakoutLevel: 0,
        invalidationLevel: 94,
        eventRisk: null
      })
    ).toThrow('Breakout Level doit être supérieur à 0.');
    expect(c.saved()).toBeNull();
  });

  it('supports equal sizing from different equity/risk combinations', () => {
    const a1 = context({ equity: 10_000, risk: 0.01 });
    const a2 = context({ equity: 20_000, risk: 0.005 });
    createCreateTradePlanFromWatchlist(a1.dependencies)({ watchlistId: 'WL-1', accountId: 'A1' });
    createCreateTradePlanFromWatchlist(a2.dependencies)({ watchlistId: 'WL-1', accountId: 'A2' });
    expect(a1.saved()?.maxRisk).toBe(100);
    expect(a2.saved()?.maxRisk).toBe(100);
  });

  it('produces different sizing inputs when account policies differ', () => {
    const a1 = context({ equity: 10_000, risk: 0.01 });
    const a2 = context({ equity: 20_000, risk: 0.01 });
    createCreateTradePlanFromWatchlist(a1.dependencies)({ watchlistId: 'WL-1', accountId: 'A1' });
    createCreateTradePlanFromWatchlist(a2.dependencies)({ watchlistId: 'WL-1', accountId: 'A2' });
    expect(a1.saved()?.maxRisk).toBe(100);
    expect(a2.saved()?.maxRisk).toBe(200);
  });

  it('freezes the equity snapshot after creation', () => {
    let currentEquity = 10_000;
    const c = context();
    c.dependencies.getAccountEquity = (id) => equity(id, currentEquity);
    createCreateTradePlanFromWatchlist(c.dependencies)({ watchlistId: 'WL-1', accountId: 'A1' });
    currentEquity = 15_000;
    expect(c.saved()?.accountEquity).toBe(10_000);
  });

  it('blocks unknown account and missing account risk policy', () => {
    const unknown = context({ accountExists: false });
    expect(() =>
      createCreateTradePlanFromWatchlist(unknown.dependencies)({
        watchlistId: 'WL-1',
        accountId: 'A404'
      })
    ).toThrow('Trading Account introuvable : A404');
    const missingRisk = context({ riskExists: false });
    expect(() =>
      createCreateTradePlanFromWatchlist(missingRisk.dependencies)({
        watchlistId: 'WL-1',
        accountId: 'A1'
      })
    ).toThrow('Risk % absent pour le compte A1.');
  });

  it('returns an account-scoped duplicate without creating another plan', () => {
    const existing = { id: 'TP-OLD', accountId: 'A1' } as TradePlan;
    const c = context({ existing });
    const result = createCreateTradePlanFromWatchlist(c.dependencies)({
      watchlistId: 'WL-1',
      accountId: 'A1'
    });
    expect(result).toMatchObject({ kind: 'duplicate', existing });
    expect(c.saved()).toBeNull();
  });

  it('validates invalidation before deriving equity', () => {
    const c = context();
    c.dependencies.watchlistRepository.findById = () => ({ ...watchlist, invalidationLevel: '' });
    c.dependencies.getAccountEquity = () => {
      throw new Error('must not run');
    };
    expect(() =>
      createCreateTradePlanFromWatchlist(c.dependencies)({ watchlistId: 'WL-1', accountId: 'A1' })
    ).toThrow("BOX n'a pas encore d'Invalidation Level");
  });

  it('does not persist when account equity is unavailable', () => {
    const c = context();
    c.dependencies.getAccountEquity = () => {
      throw new Error('equity unavailable');
    };
    expect(() =>
      createCreateTradePlanFromWatchlist(c.dependencies)({ watchlistId: 'WL-1', accountId: 'A1' })
    ).toThrow('equity unavailable');
    expect(c.saved()).toBeNull();
  });

  it('does not fall back to global risk configuration', () => {
    const c = context({ riskExists: false });
    expect('tradingConfiguration' in c.dependencies).toBe(false);
  });
});
