import { describe, expect, it, vi } from 'vitest';
import { createRefreshMarketSignals } from '@trading-cockpit/backend-core/application/market-signals/refresh-market-signals';
import type {
  MarketSignalBatch,
  MarketSignalFeed
} from '@trading-cockpit/backend-core/domain/market-signal';
import type { MarketSignalSource } from '@trading-cockpit/backend-core/ports/outbound/market-signal-source';

const feed: MarketSignalFeed = {
  id: 'MOMENTUM_V1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1'
};
const batch: MarketSignalBatch = {
  feed,
  attributeNames: ['Ticker', 'Price'],
  signals: [{ ticker: 'BOX', attributes: { Ticker: 'BOX', Price: 30 } }]
};

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
    strategyCatalog: {
      getById: vi.fn(() => ({ id: feed.strategyId, version: 'V1', enabled: true }))
    },
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
    expect(value.refresh()).toBe(1);
    expect(value.projection.replace).toHaveBeenCalledWith(batch, new Date('2026-08-28T12:00:00Z'));
    expect(value.archiveSignals).toHaveBeenCalledWith(batch);
  });

  it('rejects disabled strategy before calling the source', () => {
    const value = context();
    const refresh = createRefreshMarketSignals({
      source: value.source,
      strategyCatalog: { getById: () => ({ id: feed.strategyId, version: 'V1', enabled: false }) },
      projection: value.projection,
      archiveSignals: value.archiveSignals,
      now: () => new Date()
    });
    expect(refresh).toThrow('La stratégie MOMENTUM_BREAKOUT est désactivée.');
    expect(value.source.fetchSignals).not.toHaveBeenCalled();
  });

  it('preserves strategy version validation', () => {
    const value = context();
    const refresh = createRefreshMarketSignals({
      source: value.source,
      strategyCatalog: { getById: () => ({ id: feed.strategyId, version: 'V2', enabled: true }) },
      projection: value.projection,
      archiveSignals: value.archiveSignals,
      now: () => new Date()
    });
    expect(refresh).toThrow(
      'Version incohérente pour MOMENTUM_BREAKOUT. Screener=V1, Strategies=V2.'
    );
  });

  it('aggregates archives for multiple provider-neutral feeds', () => {
    const secondFeed = { ...feed, id: 'SECOND' };
    const source: MarketSignalSource = {
      listFeeds: () => [feed, secondFeed],
      fetchSignals: (id) => ({ ...batch, feed: id === feed.id ? feed : secondFeed })
    };
    const value = context(source);
    expect(value.refresh()).toBe(2);
    expect(value.archiveSignals).toHaveBeenCalledTimes(2);
  });
});
