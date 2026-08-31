import { describe, expect, it } from 'vitest';
import {
  calculateMaxRisk,
  calculatePlannedQuantity,
  calculatePositionValue,
  calculateRewardPerShare,
  calculateRiskPerShare,
  calculateRiskReward,
  createTradePlan,
  isActiveTradePlanStatus,
  normalizeTradePlanSource,
  requireTradePlanInvalidationLevel,
  updateTradePlanPlanning,
  validateTradingRiskConfiguration
} from '@trading-cockpit/core/domain/trade-plan';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';

const watchlistEntry: WatchlistEntry = {
  id: ' WL-1 ',
  strategyId: ' momentum_breakout ',
  strategyName: ' Momentum Breakout ',
  strategyVersion: ' V1 ',
  signalDate: '2026-08-27',
  ticker: ' urnb ',
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

describe('Trade Plan formula parity calculations', () => {
  it.each([
    [10, 8, 2],
    [10, 10, 0],
    [8, 10, -2],
    [10.25, 8.1, 2.1500000000000004],
    [null, 8, null],
    [10, null, null],
    [Number.NaN, 8, null]
  ] as const)('calculates Risk / Share parity for %s and %s', (entry, stop, expected) => {
    expect(calculateRiskPerShare(entry, stop)).toBe(expected);
  });

  it.each([
    [10, 15, 5],
    [10, 10, 0],
    [10, 8, -2],
    [null, 15, null],
    [10, null, null]
  ] as const)('calculates Reward / Share parity for %s and %s', (entry, target, expected) => {
    expect(calculateRewardPerShare(entry, target)).toBe(expected);
  });

  it.each([
    [2, 6, 3],
    [2, 0, 0],
    [2, -2, -1],
    [0, 6, null],
    [-2, 6, null],
    [null, 6, null],
    [2, null, null]
  ] as const)('calculates Risk : Reward parity for %s and %s', (risk, reward, expected) => {
    expect(calculateRiskReward(risk, reward)).toBe(expected);
  });

  it.each([
    [10_000, 0.005, 50],
    [0, 0.005, 0],
    [10_000, 0, 0],
    [null, 0.005, null],
    [10_000, null, null]
  ] as const)('calculates Max Risk parity for %s and %s', (equity, risk, expected) => {
    expect(calculateMaxRisk(equity, risk)).toBe(expected);
  });

  it.each([
    [50, 2, 25],
    [50, 3, 16],
    [50.5, 2.2, 22],
    [0, 2, 0],
    [50, 0, null],
    [50, -2, null],
    [null, 2, null]
  ] as const)(
    'calculates floored Position Size parity for %s and %s',
    (maxRisk, risk, expected) => {
      expect(calculatePlannedQuantity(maxRisk, risk)).toBe(expected);
    }
  );

  it.each([
    [25, 10, 250],
    [0, 10, 0],
    [25, 0, 0],
    [null, 10, null],
    [25, null, null]
  ] as const)('calculates Position Value parity for %s and %s', (quantity, entry, expected) => {
    expect(calculatePositionValue(quantity, entry)).toBe(expected);
  });
});

describe('Trade Plan domain', () => {
  it('requires account ownership for newly created Trade Plans', () => {
    const source = normalizeTradePlanSource(watchlistEntry);
    expect(() =>
      createTradePlan(source, { accountEquity: 10_000, riskPercent: 0.01 }, '', 'TP-1', new Date())
    ).toThrow('Account ID absent.');
  });
  it('normalizes the source and creates the exact legacy defaults', () => {
    const source = normalizeTradePlanSource(watchlistEntry);
    const createdAt = new Date('2026-08-27T14:00:00.000Z');

    expect(
      createTradePlan(
        source,
        { accountEquity: 10_000, riskPercent: 0.005 },
        'A1',
        'TP-1',
        createdAt
      )
    ).toMatchObject({
      id: 'TP-1',
      watchlistId: 'WL-1',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'URNB',
      referencePrice: 56.5,
      createdAt,
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
    });
  });

  it.each([
    ['id', '', 'Watchlist ID absent.'],
    ['strategyId', '', 'Strategy ID absent.'],
    ['strategyName', '', 'Strategy absente.'],
    ['strategyVersion', '', 'Strategy Version absente.'],
    ['ticker', '', 'Ticker absent.']
  ] as const)('rejects missing %s with the legacy message', (field, value, message) => {
    expect(() => normalizeTradePlanSource({ ...watchlistEntry, [field]: value })).toThrow(message);
  });

  it.each([0, -1, 'not-a-price', false] as const)(
    'preserves the legacy acceptance of non-blank invalidation value %s',
    (invalidationLevel) => {
      const source = normalizeTradePlanSource({ ...watchlistEntry, invalidationLevel });

      expect(() => requireTradePlanInvalidationLevel(source)).not.toThrow();
    }
  );

  it.each(['', null] as const)('rejects blank invalidation value %s', (invalidationLevel) => {
    const source = normalizeTradePlanSource({ ...watchlistEntry, invalidationLevel });

    expect(() => requireTradePlanInvalidationLevel(source)).toThrow(
      "URNB n'a pas encore d'Invalidation Level. Définis-le avant de créer un Trade Plan."
    );
  });

  it.each(['DRAFT', ' READY ', 'draft'])('recognizes active plan status %s', (status) => {
    expect(isActiveTradePlanStatus(status)).toBe(true);
  });

  it.each(['EXECUTED', 'CANCELLED', '', 'UNKNOWN'])(
    'recognizes inactive plan status %s',
    (status) => {
      expect(isActiveTradePlanStatus(status)).toBe(false);
    }
  );

  it('updates user-owned planning inputs with existing backend calculations', () => {
    const current = createTradePlan(
      normalizeTradePlanSource(watchlistEntry),
      { accountEquity: 10_000, riskPercent: 0.01 },
      'A1',
      'TP-1',
      new Date()
    );

    expect(
      updateTradePlanPlanning(current, {
        entryPrice: 57,
        stopPrice: 52,
        targetPrice: 67,
        positionSize: null
      })
    ).toMatchObject({
      entryPrice: 57,
      stopPrice: 52,
      targetPrice: 67,
      riskPerShare: 5,
      rewardPerShare: 10,
      riskReward: 2,
      maxRisk: 100,
      positionSize: 20,
      positionValue: 1140,
      status: 'DRAFT'
    });
  });

  it('supports an optional target without inventing reward values', () => {
    const current = createTradePlan(
      normalizeTradePlanSource(watchlistEntry),
      { accountEquity: 10_000, riskPercent: 0.01 },
      'A1',
      'TP-1',
      new Date()
    );
    expect(
      updateTradePlanPlanning(current, {
        entryPrice: 57,
        stopPrice: 52,
        targetPrice: null,
        positionSize: null
      })
    ).toMatchObject({ targetPrice: '', rewardPerShare: null, riskReward: null, positionSize: 20 });
  });

  it('uses an explicit Position Size override and recalculates planned capital', () => {
    const current = createTradePlan(
      normalizeTradePlanSource(watchlistEntry),
      { accountEquity: 10_000, riskPercent: 0.01 },
      'A1',
      'TP-1',
      new Date()
    );
    expect(
      updateTradePlanPlanning(current, {
        entryPrice: 57,
        stopPrice: 52,
        targetPrice: 67,
        positionSize: 12
      })
    ).toMatchObject({ positionSize: 12, positionValue: 684, maxRisk: 100 });
  });

  it.each([
    [
      { entryPrice: Number.NaN, stopPrice: 52, targetPrice: null, positionSize: null },
      'Planned Entry'
    ],
    [
      { entryPrice: 57, stopPrice: Number.NaN, targetPrice: null, positionSize: null },
      'Stop Price'
    ],
    [
      { entryPrice: 57, stopPrice: 52, targetPrice: Number.NaN, positionSize: null },
      'Target Price'
    ],
    [
      { entryPrice: 52, stopPrice: 52, targetPrice: null, positionSize: null },
      'supérieur au Stop Price'
    ],
    [
      { entryPrice: 57, stopPrice: 52, targetPrice: 56, positionSize: null },
      'supérieur au Planned Entry'
    ],
    [{ entryPrice: 57, stopPrice: 52, targetPrice: null, positionSize: 1.5 }, 'Position Size'],
    [
      { entryPrice: 57, stopPrice: 52, targetPrice: null, positionSize: 21 },
      'dépasse le risque maximum'
    ]
  ])('rejects invalid planning input %o', (inputs, message) => {
    const current = createTradePlan(
      normalizeTradePlanSource(watchlistEntry),
      { accountEquity: 10_000, riskPercent: 0.01 },
      'A1',
      'TP-1',
      new Date()
    );
    expect(() => updateTradePlanPlanning(current, inputs)).toThrow(message);
  });

  it.each([
    [{ accountEquity: 0, riskPercent: 0.005 }, 'Account Equity doit être supérieur à 0.'],
    [{ accountEquity: Number.NaN, riskPercent: 0.005 }, 'Account Equity doit être supérieur à 0.'],
    [
      { accountEquity: 10_000, riskPercent: 0 },
      'Default Risk % doit être compris entre 0% et 100%.'
    ],
    [
      { accountEquity: 10_000, riskPercent: 1.01 },
      'Default Risk % doit être compris entre 0% et 100%.'
    ]
  ] as const)('rejects invalid risk configuration', (configuration, message) => {
    expect(() => validateTradingRiskConfiguration(configuration)).toThrow(message);
  });
});
