import { describe, expect, it } from 'vitest';
import { createGetDashboardSummary } from '../../src/core/application/dashboard/get-dashboard-summary';

describe('get Dashboard summary', () => {
  it('returns a stable serializable DTO from the current source snapshot', () => {
    const getDashboardSummary = createGetDashboardSummary({
      repository: {
        readPipelineSnapshot: () => ({
          signals: 12,
          watchlist: 8,
          ready: 3,
          activeTradePlans: 2,
          openPositions: 1,
          closedTrades: 14
        })
      },
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    const result = getDashboardSummary();
    expect(result).toEqual({
      generatedAt: '2026-08-28T16:04:00.000Z',
      signals: 12,
      watchlist: 8,
      ready: 3,
      activeTradePlans: 2,
      openPositions: 1,
      closedTrades: 14
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
