import { describe, expect, it } from 'vitest';
import {
  POSITION_HEADERS,
  positionFromRow,
  positionToRow
} from '../../src/adapters/outbound/google-sheets/position/position-mapper';
import type { Position } from '@trading-cockpit/core/domain/position';

const openedAt = new Date('2026-08-27T14:00:00.000Z');
const position: Position = {
  id: 'P-1',
  accountId: 'A1',
  tradePlanId: 'TP-1',
  watchlistId: 'WL-1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
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
};

describe('Position row mapper', () => {
  it('preserves blank Actual execution snapshots for safe reconciliation', () => {
    const row = positionToRow({ ...position, actualEntry: '', actualQuantity: '' });
    expect(positionFromRow([...POSITION_HEADERS], row)).toMatchObject({
      actualEntry: '',
      actualQuantity: ''
    });
  });

  it('writes the canonical 25-column row and leaves formula-owned cells empty', () => {
    expect(positionToRow(position)).toEqual([
      'P-1',
      'TP-1',
      'WL-1',
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'URNB',
      openedAt,
      57,
      57,
      10,
      10,
      52,
      52,
      67,
      50,
      2,
      '',
      '',
      '',
      'OPEN',
      '',
      '',
      '',
      '',
      'A1'
    ]);
  });

  it('reads all values and live formula results explicitly by header', () => {
    const row = positionToRow(position);
    row[16] = 60;
    row[17] = 30;
    row[18] = 0.0526;

    expect(positionFromRow([...POSITION_HEADERS], row)).toEqual({
      ...position,
      currentPrice: 60,
      unrealizedPnl: 30,
      unrealizedPnlPercent: 0.0526
    });
  });

  it('fails with the established missing-column message', () => {
    expect(() => positionFromRow([], [])).toThrow('Colonne absente : Position ID');
  });
});
