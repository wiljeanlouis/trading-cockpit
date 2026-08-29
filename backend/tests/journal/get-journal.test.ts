import { describe, expect, it } from 'vitest';
import { createGetJournal } from '../../src/core/application/journal/get-journal';
import type { JournalEntry } from '../../src/core/domain/journal-entry';

const entry: JournalEntry = {
  id: 'J-1',
  positionId: 'P-1',
  accountId: 'A1',
  tradePlanId: 'TP-1',
  watchlistId: 'WL-1',
  strategyId: 'BREAKOUT',
  strategyName: 'Breakout',
  strategyVersion: 'V1',
  ticker: 'BOX',
  openedAt: new Date('2026-08-20T14:00:00.000Z'),
  closedAt: new Date('2026-08-27T15:00:00.000Z'),
  plannedEntry: 33,
  actualEntry: 33.1,
  exitPrice: 36.5,
  quantity: 40,
  initialStop: 31,
  target: 38,
  plannedMaxRisk: 84,
  plannedRiskReward: 2.38,
  realizedPnl: 136,
  returnPercent: 0.1027,
  rMultiple: 1.619,
  outcome: 'WIN',
  exitReason: 'MANUAL',
  executionNotes: 'Good execution',
  lessonsLearned: 'Keep position sizing stable',
  followedPlan: 'YES'
};

describe('get Journal', () => {
  it('returns persisted completed-trade values without recalculating financial metrics', () => {
    const result = createGetJournal({
      reader: { findAll: () => [entry] },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result).toEqual({
      generatedAt: '2026-08-28T16:00:00.000Z',
      items: [
        {
          ...entry,
          openedAt: '2026-08-20T14:00:00.000Z',
          closedAt: '2026-08-27T15:00:00.000Z'
        }
      ]
    });
  });

  it('maps blank and invalid formula values to null', () => {
    const result = createGetJournal({
      reader: {
        findAll: () => [
          {
            ...entry,
            exitPrice: '',
            realizedPnl: '#N/A',
            returnPercent: Number.NaN,
            rMultiple: Number.POSITIVE_INFINITY,
            outcome: null,
            exitReason: ''
          }
        ]
      },
      now: () => new Date()
    })();

    expect(result.items[0]).toMatchObject({
      exitPrice: null,
      realizedPnl: null,
      returnPercent: null,
      rMultiple: null,
      outcome: null,
      exitReason: null
    });
  });
});
