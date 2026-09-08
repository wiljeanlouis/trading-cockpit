import { describe, expect, it } from 'vitest';
import { createGetDiscovery } from '@trading-cockpit/core/application/discovery/get-discovery';
import type { SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';
import type {
  TradingStrategy,
  TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';

const strategies: TradingStrategy[] = [
  {
    id: 'MOMENTUM_BREAKOUT',
    name: 'Momentum Breakout',
    type: 'MOMENTUM',
    enabled: true,
    description: ''
  },
  {
    id: 'QUALITY_DIP',
    name: 'Quality Dip',
    type: 'MEAN_REVERSION',
    enabled: false,
    description: ''
  }
];

const versions: TradingStrategyVersion[] = [
  {
    strategyId: 'MOMENTUM_BREAKOUT',
    version: 'V1',
    enabled: true,
    screenerCode: 'MOMENTUM_BREAKOUT_V1',
    screener: 'FINVIZ',
    screenerUrl: 'https://elite.finviz.com/export/screener?v=151'
  },
  {
    strategyId: 'QUALITY_DIP',
    version: 'V1',
    enabled: true,
    screenerCode: 'QUALITY_DIP_V1',
    screener: 'FINVIZ',
    screenerUrl: 'https://elite.finviz.com/export/screener?v=151'
  }
];

function signal(overrides: Partial<SignalSnapshot>): SignalSnapshot {
  return {
    signalDate: '2026-08-28',
    detectedAt: new Date('2026-08-28T14:30:00.000Z'),
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1',
    ticker: 'BOX',
    attributes: {
      Ticker: 'BOX',
      Company: 'Box Inc',
      Sector: 'Technology',
      Price: 34.82,
      'Relative Volume': 1.5,
      '52-Week High': 36,
      'Earnings Date': new Date('2026-09-01T08:30:00.000Z')
    },
    ...overrides
  };
}

function watchlistEntry(overrides: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: 'WL-1',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1',
    signalDate: '2026-08-28',
    ticker: 'BOX',
    company: 'Box Inc',
    sector: 'Technology',
    addedAt: new Date('2026-08-28T15:00:00.000Z'),
    signalPrice: 34.82,
    currentPrice: 34.82,
    status: 'PLANNED',
    setupStatus: '',
    triggerLevel: null,
    invalidationLevel: null,
    earningsDate: null,
    eventRisk: '',
    notes: '',
    closedAt: null,
    ...overrides
  };
}

describe('get Discovery', () => {
  it('returns latest Signals History candidates for active Strategy Versions only', () => {
    const getDiscovery = createGetDiscovery({
      signalReader: {
        findAllSignals: () => [
          signal({ signalDate: '2026-08-27', ticker: 'OLD' }),
          signal({ signalDate: '2026-08-28', ticker: 'BOX' }),
          signal({
            strategyId: 'QUALITY_DIP',
            strategyName: 'Quality Dip',
            ticker: 'QDIP'
          })
        ],
        findAllStrategies: () => strategies,
        findAllStrategyVersions: () => versions
      },
      watchlistReader: { findAll: () => [watchlistEntry({ ticker: 'BOX' })] },
      now: () => new Date('2026-08-28T16:00:00.000Z')
    });

    const result = getDiscovery();

    expect(result.generatedAt).toBe('2026-08-28T16:00:00.000Z');
    expect(result.strategies).toEqual([
      {
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyName: 'Momentum Breakout',
        strategyVersion: 'V1',
        screener: 'FINVIZ'
      }
    ]);
    expect(result.items).toEqual([
      expect.objectContaining({
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-28',
        ticker: 'BOX',
        company: 'Box Inc',
        price: 34.82,
        earningsDate: '2026-09-01T08:30:00.000Z',
        attributes: expect.objectContaining({
          'Earnings Date': '2026-09-01T08:30:00.000Z'
        }),
        watchlistStatus: 'PLANNED'
      })
    ]);
  });
});
