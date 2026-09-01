import { describe, expect, it } from 'vitest';
import { createGetAnalytics } from '@trading-cockpit/core/application/analytics/get-analytics';
import type { JournalEntry } from '@trading-cockpit/core/domain/journal-entry';

function journalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'J-1',
    positionId: 'P-1',
    accountId: 'A1',
    tradePlanId: 'TP-1',
    watchlistId: 'WL-1',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
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
    plannedMaxRisk: 100,
    plannedRiskReward: 2.38,
    realizedPnl: 150,
    returnPercent: 0.1027,
    rMultiple: 1.5,
    outcome: 'WIN',
    exitReason: 'MANUAL',
    executionNotes: '',
    lessonsLearned: '',
    followedPlan: '',
    ...overrides
  };
}

describe('get Analytics', () => {
  it('calculates current metrics from authoritative Journal entries', () => {
    const getAnalytics = createGetAnalytics({
      journalReader: {
        findAll: () => [
          journalEntry(),
          journalEntry({
            id: 'J-2',
            positionId: 'P-2',
            strategyVersion: 'V2',
            realizedPnl: -50,
            plannedMaxRisk: 100,
            rMultiple: -0.5,
            outcome: 'LOSS'
          }),
          journalEntry({
            id: 'J-3',
            positionId: 'P-3',
            strategyId: 'QUALITY_DIP',
            strategyName: 'Quality Dip',
            strategyVersion: 'V1',
            realizedPnl: 0,
            plannedMaxRisk: 100,
            rMultiple: 0,
            outcome: 'BREAKEVEN'
          })
        ]
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    });

    const result = getAnalytics();

    expect(result).toMatchObject({
      generatedAt: '2026-08-28T16:00:00.000Z',
      available: true,
      summary: {
        trades: 3,
        wins: 1,
        losses: 1,
        breakeven: 1,
        winRate: 1 / 3,
        profitFactor: 3,
        totalPnl: 100,
        averagePnl: 100 / 3,
        grossProfit: 150,
        grossLoss: -50,
        totalR: 1,
        averageR: 1 / 3,
        averageWinnerR: 1.5,
        averageLoserR: -0.5,
        bestR: 1.5
      }
    });
    expect(result.summary.expectancyR).toBeCloseTo(1 / 3);
    expect(result.byStrategy.map((row) => row.strategyId)).toEqual([
      'MOMENTUM_BREAKOUT',
      'QUALITY_DIP'
    ]);
    expect(result.byStrategy[0]).toMatchObject({ trades: 2, wins: 1, totalPnl: 100, totalR: 1 });
    expect(result.byStrategyVersion.map((row) => `${row.strategyId}/${row.version}`)).toEqual([
      'MOMENTUM_BREAKOUT/V1',
      'MOMENTUM_BREAKOUT/V2',
      'QUALITY_DIP/V1'
    ]);
    expect(result.byAccount).toEqual([
      expect.objectContaining({
        accountId: 'A1',
        trades: 3,
        wins: 1,
        losses: 1,
        breakeven: 1,
        realizedPnl: 100,
        totalR: 1
      })
    ]);
  });

  it('filters Analytics by account and recomputes ratios from underlying trades', () => {
    const result = createGetAnalytics({
      journalReader: {
        findAll: () => [
          journalEntry({
            id: 'J-A1-WIN',
            positionId: 'P1',
            accountId: 'A1',
            realizedPnl: 100,
            rMultiple: 1
          }),
          journalEntry({
            id: 'J-A1-LOSS',
            positionId: 'P2',
            accountId: 'A1',
            realizedPnl: -50,
            rMultiple: -0.5
          }),
          journalEntry({
            id: 'J-A2-WIN',
            positionId: 'P3',
            accountId: 'A2',
            realizedPnl: 900,
            rMultiple: 9
          })
        ]
      },
      accounts: [
        { id: 'A1', name: 'Account 1', baseCurrency: 'CAD' },
        { id: 'A2', name: 'Account 2', baseCurrency: 'CAD' }
      ],
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })({ scope: { type: 'ACCOUNT', accountId: 'A1' } });

    expect(result.scope).toEqual({ type: 'ACCOUNT', accountId: 'A1' });
    expect(result.summary).toMatchObject({
      trades: 2,
      wins: 1,
      losses: 1,
      winRate: 0.5,
      profitFactor: 2,
      totalPnl: 50,
      totalR: 0.5,
      averageR: 0.25
    });
    expect(result.byAccount).toEqual([
      expect.objectContaining({ accountId: 'A1', accountName: 'Account 1', trades: 2 })
    ]);
  });

  it('filters Analytics by account, strategy and strategy version', () => {
    const result = createGetAnalytics({
      journalReader: {
        findAll: () => [
          journalEntry({
            id: 'J1',
            positionId: 'P1',
            accountId: 'A1',
            strategyVersion: 'V1',
            realizedPnl: 100,
            rMultiple: 1
          }),
          journalEntry({
            id: 'J2',
            positionId: 'P2',
            accountId: 'A1',
            strategyVersion: 'V2',
            realizedPnl: 200,
            rMultiple: 2
          }),
          journalEntry({
            id: 'J3',
            positionId: 'P3',
            accountId: 'A1',
            strategyId: 'QUALITY_DIP',
            strategyName: 'Quality Dip',
            strategyVersion: 'V1',
            realizedPnl: 300,
            rMultiple: 3
          }),
          journalEntry({
            id: 'J4',
            positionId: 'P4',
            accountId: 'A2',
            strategyVersion: 'V1',
            realizedPnl: 400,
            rMultiple: 4
          })
        ]
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })({
      scope: { type: 'ACCOUNT', accountId: 'A1' },
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V2'
    });

    expect(result.summary).toMatchObject({
      trades: 1,
      totalPnl: 200,
      totalR: 2
    });
    expect(result.byStrategyVersion).toEqual([
      expect.objectContaining({ strategyId: 'MOMENTUM_BREAKOUT', version: 'V2', trades: 1 })
    ]);
  });

  it('returns an available empty snapshot when Journal has no closed trades yet', () => {
    const result = createGetAnalytics({
      journalReader: { findAll: () => [] },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.available).toBe(true);
    expect(result.summary.trades).toBe(0);
  });

  it('preserves legacy number coercion for blank Journal formula values', () => {
    const result = createGetAnalytics({
      journalReader: {
        findAll: () => [
          journalEntry({
            realizedPnl: '',
            rMultiple: null
          })
        ]
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.summary).toMatchObject({
      trades: 1,
      wins: 0,
      losses: 0,
      breakeven: 1,
      totalPnl: 0,
      totalR: 0
    });
  });

  it('reports Analytics unavailable when the Journal sheet is absent', () => {
    const result = createGetAnalytics({
      journalReader: {
        findAll: () => {
          throw new Error('Journal est absent.');
        }
      },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    })();

    expect(result.available).toBe(false);
    expect(result.summary.trades).toBe(0);
  });
});
