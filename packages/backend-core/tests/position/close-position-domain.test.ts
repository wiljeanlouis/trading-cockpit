import { describe, expect, it } from 'vitest';
import {
  calculateRealizedPnl,
  closePosition
} from '@trading-cockpit/backend-core/domain/position';
import { openPosition } from '../fixtures/position';

describe('Position close domain', () => {
  it.each([
    [12, 10],
    [8, -10],
    [10, 0]
  ])('calculates realized P&L for exit %s', (exit, pnl) => {
    expect(calculateRealizedPnl(exit, 10, 5)).toBe(pnl);
  });

  it('preserves legacy zero, negative and NaN arithmetic', () => {
    expect(calculateRealizedPnl(10, 0, 0)).toBe(0);
    expect(calculateRealizedPnl(10, 12, -2)).toBe(4);
    expect(calculateRealizedPnl(10, Number.NaN, 2)).toBeNaN();
  });

  it('transitions OPEN to CLOSED with timestamp, exit and P&L', () => {
    const closedAt = new Date('2026-08-27T14:00:00Z');
    expect(closePosition(openPosition, 12, closedAt)).toMatchObject({
      status: 'CLOSED',
      closedAt,
      exitPrice: 12,
      realizedPnl: 10
    });
  });

  it.each(['CLOSED', 'STOPPED', 'TARGET HIT', 'UNKNOWN'])(
    'rejects terminal/non-OPEN %s',
    (status) => {
      expect(() => closePosition({ ...openPosition, status }, 12, new Date())).toThrow(
        "URNB n'est pas une position OPEN."
      );
    }
  );
});
