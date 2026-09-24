import { describe, expect, it, vi } from 'vitest';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import type {
  MarketSignalBatch,
  MarketSignalFeed
} from '@trading-cockpit/core/domain/market-signal';
import type { TradingStrategy } from '@trading-cockpit/core/domain/trading-strategy';
import type { MarketSignalSource } from '@trading-cockpit/core/ports/outbound/market-signal-source';
import type { TradingStrategyCatalog } from '@trading-cockpit/core/ports/outbound/trading-strategy-catalog';

const feed: MarketSignalFeed = {
  id: 'MOMENTUM_V1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout'
};
const batch: MarketSignalBatch = {
  feed,
  attributeNames: ['Ticker', 'Price'],
  signals: [{ ticker: 'BOX', attributes: { Ticker: 'BOX', Price: 30 } }]
};

function strategy(overrides: Partial<TradingStrategy> = {}): TradingStrategy {
  return {
    id: feed.strategyId,
    name: feed.strategyName,
    type: 'MOMENTUM',
    enabled: true,
    description: '',
    ...overrides
  };
}

function catalog(getById: (strategyId: string) => TradingStrategy): TradingStrategyCatalog {
  return {
    getById,
    findById: (strategyId) => getById(strategyId),
    findAll: () => [getById(feed.strategyId)]
  };
}

function context(source?: MarketSignalSource) {
  const marketSource: MarketSignalSource =
    source ??
    ({
      listFeeds: vi.fn(() => [feed]),
      fetchSignals: vi.fn(() => batch)
    } satisfies MarketSignalSource);
  const projection = { replace: vi.fn() };
  const archiveSignals = vi.fn(() => 1);
  const refresh = createRefreshMarketSignals({
    source: marketSource,
    strategyCatalog: catalog(vi.fn(() => strategy())),
    projection,
    archiveSignals,
    now: () => new Date('2026-08-28T12:00:00Z')
  });
  return { refresh, source: marketSource, projection, archiveSignals };
}

describe('refresh market signals', () => {
  it('works with a provider-neutral in-memory source', () => {
    const fake: MarketSignalSource = {
      listFeeds: () => [feed],
      fetchSignals: () => batch
    };
    const value = context(fake);
    expect(value.refresh()).toEqual({
      archived: 1,
      refreshed: [
        {
          archived: 1,
          signalCount: 1,
          strategyId: 'MOMENTUM_BREAKOUT'
        }
      ]
    });
    expect(value.projection.replace).toHaveBeenCalledWith(batch, new Date('2026-08-28T12:00:00Z'));
    expect(value.archiveSignals).toHaveBeenCalledWith(batch);
  });

  it('rejects disabled strategy before calling the source', () => {
    const value = context();
    const refresh = createRefreshMarketSignals({
      source: value.source,
      strategyCatalog: catalog(() => strategy({ enabled: false })),
      projection: value.projection,
      archiveSignals: value.archiveSignals,
      now: () => new Date()
    });
    expect(refresh).toThrow('La stratégie MOMENTUM_BREAKOUT est désactivée.');
    expect(value.source.fetchSignals).not.toHaveBeenCalled();
  });

  it('aggregates archives for multiple provider-neutral feeds', () => {
    const secondFeed = { ...feed, id: 'SECOND' };
    const source: MarketSignalSource = {
      listFeeds: () => [feed, secondFeed],
      fetchSignals: (id) => ({ ...batch, feed: id === feed.id ? feed : secondFeed })
    };
    const value = context(source);
    expect(value.refresh()).toEqual({
      archived: 2,
      refreshed: [
        {
          archived: 1,
          signalCount: 1,
          strategyId: 'MOMENTUM_BREAKOUT'
        },
        {
          archived: 1,
          signalCount: 1,
          strategyId: 'MOMENTUM_BREAKOUT'
        }
      ]
    });
    expect(value.archiveSignals).toHaveBeenCalledTimes(2);
  });

  it('refreshes only the requested strategy feed', () => {
    const secondFeed: MarketSignalFeed = {
      id: 'QUALITY_DIP_V1',
      strategyId: 'QUALITY_DIP',
      strategyName: 'Quality Dip'
    };
    const fetchSignals = vi.fn((id: string) => ({
      ...batch,
      feed: id === feed.id ? feed : secondFeed
    }));
    const source: MarketSignalSource = {
      listFeeds: () => [feed, secondFeed],
      fetchSignals
    };
    const projection = { replace: vi.fn() };
    const archiveSignals = vi.fn(() => 1);
    const refresh = createRefreshMarketSignals({
      source,
      strategyCatalog: catalog(vi.fn((strategyId: string) => strategy({ id: strategyId }))),
      projection,
      archiveSignals,
      now: () => new Date('2026-08-28T12:00:00Z')
    });

    expect(refresh({ strategyId: 'quality_dip' })).toEqual({
      archived: 1,
      refreshed: [
        {
          archived: 1,
          signalCount: 1,
          strategyId: 'QUALITY_DIP'
        }
      ]
    });
    expect(fetchSignals).toHaveBeenCalledOnce();
    expect(fetchSignals).toHaveBeenCalledWith('QUALITY_DIP_V1');
    expect(projection.replace).toHaveBeenCalledOnce();
    expect(archiveSignals).toHaveBeenCalledOnce();
  });

  it('rejects an unknown requested strategy feed', () => {
    const value = context();
    expect(() => value.refresh({ strategyId: 'QUALITY_DIP' })).toThrow(
      'Aucun feed actif configuré pour QUALITY_DIP.'
    );
    expect(value.source.fetchSignals).not.toHaveBeenCalled();
  });
});
