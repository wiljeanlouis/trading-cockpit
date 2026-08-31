import { describe, expect, it } from 'vitest';
import { createGetOpenPositions } from '@trading-cockpit/backend-core/application/position/get-open-positions';
import { openPosition } from '../fixtures/position';

describe('get open Positions', () => {
  it('returns only OPEN positions with persisted values serialized for the Web Cockpit', () => {
    const result = createGetOpenPositions({
      reader: {
        findAll: () => [
          {
            ...openPosition,
            openedAt: new Date('2026-08-28T14:00:00.000Z'),
            currentPrice: 12,
            unrealizedPnl: 10,
            unrealizedPnlPercent: 0.1
          },
          { ...openPosition, id: 'P-CLOSED', status: 'CLOSED' }
        ]
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.generatedAt).toBe('2026-08-28T16:00:00.000Z');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: openPosition.id,
      accountId: openPosition.accountId,
      actualEntry: openPosition.actualEntry,
      actualQuantity: openPosition.actualQuantity,
      currentPrice: 12,
      unrealizedPnl: 10,
      unrealizedPnlPercent: 0.1,
      openedAt: '2026-08-28T14:00:00.000Z',
      status: 'OPEN'
    });
  });

  it('maps blanks and formula errors to null without recalculating financial values', () => {
    const result = createGetOpenPositions({
      reader: {
        findAll: () => [{ ...openPosition, currentPrice: '#N/A', unrealizedPnl: '', target: '' }]
      },
      now: () => new Date()
    })();

    expect(result.items[0]).toMatchObject({
      currentPrice: null,
      unrealizedPnl: null,
      target: null
    });
  });
});
