import { describe, expect, it } from 'vitest';
import {
  TRADE_PLAN_HEADERS,
  tradePlanFromRow,
  tradePlanToRow
} from '../../src/adapters/outbound/google-sheets/trade-plan/trade-plan-mapper';
import type { TradePlan } from '@trading-cockpit/core/domain/trade-plan';

const createdAt = new Date('2026-08-27T14:00:00.000Z');
const tradePlan: TradePlan = {
  id: 'TP-1',
  accountId: 'A1',
  watchlistId: 'WL-1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  signalDate: '2026-08-27',
  signalPrice: 54.25,
  ticker: 'URNB',
  referencePrice: 56.5,
  setupStatus: 'TRIGGERED',
  triggerLevel: 57,
  invalidationLevel: 52,
  eventRisk: 'LOW',
  createdAt,
  entryType: 'TRIGGER',
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

describe('Trade Plan row mapper', () => {
  it('appends Account ID after the exact 29-column generic workflow row', () => {
    expect(tradePlanToRow(tradePlan)).toEqual([
      'TP-1',
      'WL-1',
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'V1',
      '2026-08-27',
      54.25,
      'URNB',
      56.5,
      'TRIGGERED',
      57,
      52,
      'LOW',
      createdAt,
      'TRIGGER',
      '',
      52,
      '',
      '',
      '',
      '',
      10_000,
      0.005,
      '',
      '',
      '',
      'DRAFT',
      '',
      'A1'
    ]);
  });

  it('reads all values and calculated formula results explicitly by header', () => {
    const row = tradePlanToRow(tradePlan);
    row[15] = 57;
    row[17] = 67;
    row[18] = 5;
    row[19] = 10;
    row[20] = 2;
    row[23] = 50;
    row[24] = 10;
    row[25] = 570;

    expect(tradePlanFromRow([...TRADE_PLAN_HEADERS], row)).toEqual({
      ...tradePlan,
      entryPrice: 57,
      targetPrice: 67,
      riskPerShare: 5,
      rewardPerShare: 10,
      riskReward: 2,
      maxRisk: 50,
      positionSize: 10,
      positionValue: 570
    });
  });

  it('fails with the established missing-column message', () => {
    expect(() => tradePlanFromRow([], [])).toThrow('Colonne absente : Trade Plan ID');
  });

  it('keeps historical rows unattributed when the appended Account ID cell is blank', () => {
    const row = tradePlanToRow({ ...tradePlan, accountId: '' });
    expect(tradePlanFromRow([...TRADE_PLAN_HEADERS], row).accountId).toBe('');
  });
});
