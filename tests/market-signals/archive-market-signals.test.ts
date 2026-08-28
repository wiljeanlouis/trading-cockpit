import { describe, expect, it, vi } from 'vitest';
import { createArchiveMarketSignals } from '../../src/core/application/market-signals/archive-market-signals';
import { buildSignalKey, type MarketSignalBatch } from '../../src/core/domain/market-signal';

const batch: MarketSignalBatch = {
  feed: {
    id: 'MOMENTUM_V1',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1'
  },
  attributeNames: ['Ticker', 'Price'],
  signals: [
    { ticker: 'box', attributes: { Ticker: 'BOX', Price: 30 } },
    { ticker: '', attributes: { Ticker: '', Price: 20 } },
    { ticker: 'SHOP', attributes: { Ticker: 'SHOP', Price: 50 } }
  ]
};

describe('archive market signals', () => {
  it('persists provider-neutral signals with existing physical schema', () => {
    const repository = {
      ensureReady: vi.fn(),
      loadExistingKeys: vi.fn(() => new Set<string>()),
      append: vi.fn()
    };
    const archive = createArchiveMarketSignals({
      repository,
      now: () => new Date('2026-08-28T12:00:00Z'),
      formatSignalDate: () => '2026-08-28'
    });
    expect(archive(batch)).toBe(2);
    expect(repository.ensureReady).toHaveBeenCalledWith(['Ticker', 'Price']);
    expect(repository.append.mock.calls[0][0][0]).toEqual({
      signalDate: '2026-08-28',
      detectedAt: new Date('2026-08-28T12:00:00Z'),
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'BOX',
      attributes: { Ticker: 'BOX', Price: 30 }
    });
  });

  it('keeps existing key and same-batch deduplication', () => {
    const repository = {
      ensureReady: vi.fn(),
      loadExistingKeys: () =>
        new Set([buildSignalKey('2026-08-28', 'MOMENTUM_BREAKOUT', 'V1', 'BOX')]),
      append: vi.fn()
    };
    const archive = createArchiveMarketSignals({
      repository,
      now: () => new Date(),
      formatSignalDate: () => '2026-08-28'
    });
    expect(archive({ ...batch, signals: [...batch.signals, batch.signals[2]] })).toBe(1);
  });

  it('does not touch persistence for an empty signal batch', () => {
    const repository = { ensureReady: vi.fn(), loadExistingKeys: vi.fn(), append: vi.fn() };
    const archive = createArchiveMarketSignals({
      repository,
      now: () => new Date(),
      formatSignalDate: () => '2026-08-28'
    });
    expect(archive({ ...batch, signals: [] })).toBe(0);
    expect(repository.ensureReady).not.toHaveBeenCalled();
  });
});
