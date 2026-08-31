import { describe, expect, it } from 'vitest';
import {
  calculateJournalReturn,
  calculateOutcome,
  calculateRMultiple,
  createJournalEntryFromClosedPosition
} from '@trading-cockpit/backend-core/domain/journal-entry';
import { openPosition } from '../fixtures/position';

describe('Journal domain metrics', () => {
  it.each([
    [12, 10, 0.2],
    [8, 10, -0.2]
  ])('calculates Return %%', (exit, entry, expected) => {
    expect(calculateJournalReturn(exit, entry)).toBeCloseTo(expected);
  });
  it('preserves blank and division-by-zero Sheet semantics', () => {
    expect(calculateJournalReturn('', 10)).toBeNull();
    expect(calculateJournalReturn(10, 0)).toBe('DIVISION_BY_ZERO');
  });
  it.each([
    [10, 5, 2],
    [-10, 5, -2],
    [0, 5, 0]
  ])('calculates R-Multiple', (pnl, risk, expected) => {
    expect(calculateRMultiple(pnl, risk)).toBe(expected);
  });
  it.each([
    ['', 10],
    [10, 0],
    [10, -1],
    [null, 10]
  ])('returns blank-equivalent for pnl=%s risk=%s', (pnl, risk) => {
    expect(calculateRMultiple(pnl, risk)).toBeNull();
  });
  it.each([
    [10, 'WIN'],
    [-10, 'LOSS'],
    [0, 'BREAKEVEN'],
    ['', null]
  ])('derives Outcome', (pnl, outcome) => {
    expect(calculateOutcome(pnl)).toBe(outcome);
  });
});

describe('Journal Entry snapshot', () => {
  it('copies the closed Position and leaves user annotations empty', () => {
    const position = {
      ...openPosition,
      status: 'CLOSED',
      closedAt: new Date(),
      exitPrice: 12,
      realizedPnl: 10
    };
    const entry = createJournalEntryFromClosedPosition(position, 'J-1');
    expect(entry).toMatchObject({
      id: 'J-1',
      positionId: 'P-1',
      accountId: 'A1',
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      rMultiple: 1,
      outcome: 'WIN',
      exitReason: '',
      executionNotes: '',
      lessonsLearned: '',
      followedPlan: ''
    });
    expect(entry.returnPercent).toBeCloseTo(0.2);
  });
});
