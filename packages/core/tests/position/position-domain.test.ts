import { describe, expect, it } from 'vitest';
import {
  calculateUnrealizedPnl,
  calculateUnrealizedPnlPercent,
  createOpenPosition,
  isOpenPositionStatus,
  normalizePositionSource,
  requireExecutableTradePlanStatus,
  requirePositionExecutionData
} from '@trading-cockpit/core/domain/position';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';

const tradePlan: TradePlan = {
  id: ' TP-1 ',
  accountId: ' A1 ',
  watchlistId: ' WL-1 ',
  strategyId: ' momentum_breakout ',
  strategyName: ' Momentum Breakout ',
  strategyVersion: ' V1 ',
  signalDate: '2026-08-27',
  signalPrice: 54.25,
  ticker: ' urnb ',
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

describe('Position formula parity calculations', () => {
  it.each([
    [60, 57, 10, 30],
    [54, 57, 10, -30],
    [57, 57, 10, 0],
    [60.25, 57.1, 3.5, 11.024999999999995],
    [60, 57, -2, -6],
    [null, 57, 10, null],
    [60, null, 10, null],
    [60, 57, null, null],
    [Number.NaN, 57, 10, null]
  ] as const)(
    'calculates Unrealized P&L parity for %s, %s, %s',
    (currentPrice, actualEntry, quantity, expected) => {
      expect(calculateUnrealizedPnl(currentPrice, actualEntry, quantity)).toBe(expected);
    }
  );

  it.each([
    [60, 50, 0.19999999999999996],
    [50, 50, 0],
    [40, 50, -0.19999999999999996],
    [null, 50, null],
    [60, null, null]
  ] as const)('calculates Unrealized P&L %% parity for %s and %s', (current, entry, expected) => {
    expect(calculateUnrealizedPnlPercent(current, entry)).toBe(expected);
  });

  it('preserves the division-by-zero edge exposed by the Sheet formula', () => {
    expect(calculateUnrealizedPnlPercent(60, 0)).toBe('DIVISION_BY_ZERO');
    expect(calculateUnrealizedPnlPercent(0, 0)).toBe('DIVISION_BY_ZERO');
  });
});

describe('Position domain', () => {
  it('creates the exact OPEN defaults and preserves planned versus actual values', () => {
    const source = normalizePositionSource(tradePlan);
    const openedAt = new Date('2026-08-27T14:00:00.000Z');

    expect(createOpenPosition(source, 'P-1', openedAt)).toEqual({
      id: 'P-1',
      accountId: 'A1',
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'URNB',
      openedAt,
      plannedEntry: 57,
      actualEntry: 57,
      plannedQuantity: 10,
      actualQuantity: 10,
      initialStop: 52,
      currentStop: 52,
      target: 67,
      plannedMaxRisk: 50,
      plannedRiskReward: 2,
      currentPrice: '',
      unrealizedPnl: '',
      unrealizedPnlPercent: '',
      status: 'OPEN',
      closedAt: '',
      exitPrice: '',
      realizedPnl: '',
      notes: ''
    });
  });

  it.each([
    ['id', '', 'Trade Plan ID absent.'],
    ['watchlistId', '', 'Watchlist ID absent.'],
    ['strategyId', '', 'Strategy ID absent.'],
    ['strategyName', '', 'Strategy absente.'],
    ['strategyVersion', '', 'Strategy Version absente.'],
    ['ticker', '', 'Ticker absent.']
  ] as const)('rejects missing %s with the legacy message', (field, value, message) => {
    expect(() => normalizePositionSource({ ...tradePlan, [field]: value })).toThrow(message);
  });

  it.each(['DRAFT', 'READY', ' draft ', 'ready'])('accepts executable status %s', (status) => {
    const source = normalizePositionSource({ ...tradePlan, status });

    expect(() => requireExecutableTradePlanStatus(source)).not.toThrow();
  });

  it('uses the dedicated EXECUTED legacy error', () => {
    const source = normalizePositionSource({ ...tradePlan, status: 'EXECUTED' });

    expect(() => requireExecutableTradePlanStatus(source)).toThrow(
      'URNB est déjà marqué EXECUTED.'
    );
  });

  it('uses the dedicated CANCELLED legacy error', () => {
    const source = normalizePositionSource({ ...tradePlan, status: 'CANCELLED' });

    expect(() => requireExecutableTradePlanStatus(source)).toThrow(
      "Impossible d'exécuter un Trade Plan CANCELLED."
    );
  });

  it.each(['', 'UNKNOWN', 'OPEN'])('rejects other Trade Plan status %s', (status) => {
    const source = normalizePositionSource({ ...tradePlan, status });

    expect(() => requireExecutableTradePlanStatus(source)).toThrow(
      `Le Trade Plan URNB ne peut pas être exécuté avec le statut ${status}.`
    );
  });

  it.each([
    ['entryPrice', '', "URNB n'a pas d'Entry Price."],
    ['entryPrice', null, "URNB n'a pas d'Entry Price."],
    ['stopPrice', '', "URNB n'a pas de Stop Price."],
    ['stopPrice', null, "URNB n'a pas de Stop Price."],
    ['positionSize', '', "URNB n'a pas de Position Size valide."],
    ['positionSize', null, "URNB n'a pas de Position Size valide."],
    ['positionSize', 0, "URNB n'a pas de Position Size valide."],
    ['positionSize', -1, "URNB n'a pas de Position Size valide."]
  ] as const)('rejects invalid execution field %s=%s', (field, value, message) => {
    const source = normalizePositionSource({ ...tradePlan, [field]: value });

    expect(() => requirePositionExecutionData(source)).toThrow(message);
  });

  it.each([
    ['entryPrice', 0],
    ['entryPrice', -5],
    ['entryPrice', 'not-a-price'],
    ['stopPrice', 0],
    ['stopPrice', -5],
    ['stopPrice', 'not-a-price'],
    ['positionSize', 'not-a-quantity']
  ] as const)('rejects non-financial execution value %s=%s', (field, value) => {
    const source = normalizePositionSource({ ...tradePlan, [field]: value });

    expect(() => requirePositionExecutionData(source)).toThrow();
  });

  it('rejects LONG execution when persisted prices do not satisfy Stop < Entry < Target', () => {
    expect(() =>
      requirePositionExecutionData(
        normalizePositionSource({ ...tradePlan, entryPrice: 57, stopPrice: 57, targetPrice: 67 })
      )
    ).toThrow('Stop < Entry');
    expect(() =>
      requirePositionExecutionData(
        normalizePositionSource({ ...tradePlan, entryPrice: 57, stopPrice: 52, targetPrice: 56 })
      )
    ).toThrow('Entry < Target');
  });

  it.each(['OPEN', ' open ', 'open'])('recognizes open Position status %s', (status) => {
    expect(isOpenPositionStatus(status)).toBe(true);
  });

  it.each(['CLOSED', 'STOPPED', 'TARGET HIT', '', 'UNKNOWN'])(
    'recognizes non-open Position status %s',
    (status) => {
      expect(isOpenPositionStatus(status)).toBe(false);
    }
  );
});
