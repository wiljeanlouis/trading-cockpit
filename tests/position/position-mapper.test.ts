import { describe, expect, it } from 'vitest';
import { selectedTradePlanRowToCommand } from '../../src/adapters/inbound/google-sheets/trade-plan-selection-mapper';
import {
  POSITION_HEADERS,
  positionFromRow,
  positionToRow
} from '../../src/adapters/outbound/google-sheets/position-mapper';
import type { Position } from '../../src/core/domain/position';

const openedAt = new Date('2026-08-27T14:00:00.000Z');
const position: Position = {
  id: 'P-1',
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
};

describe('Position row mapper', () => {
  it('writes the exact 25-column legacy row and leaves formula-owned cells empty', () => {
    expect(positionToRow(position)).toEqual([
      'P-1',
      'TP-1',
      'WL-1',
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'V1',
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
      ''
    ]);
  });

  it('reads all values and live formula results explicitly by header', () => {
    const row = positionToRow(position);
    row[17] = 60;
    row[18] = 30;
    row[19] = 0.0526;

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

describe('selected Trade Plan row mapper', () => {
  it('copies only the Trade Plan ID required by the application API', () => {
    expect(
      selectedTradePlanRowToCommand(
        ['Ticker', 'Trade Plan ID', 'Status'],
        ['URNB', ' TP-1 ', 'READY']
      )
    ).toEqual({ tradePlanId: ' TP-1 ' });
  });

  it('fails with the established missing-column message', () => {
    expect(() => selectedTradePlanRowToCommand([], [])).toThrow('Colonne absente : Trade Plan ID');
  });
});
