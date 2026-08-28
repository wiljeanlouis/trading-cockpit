import {
  buildSignalKey,
  type MarketSignalBatch,
  type SignalSnapshot
} from '../../domain/market-signal';
import type { SignalHistoryRepository } from '../../../ports/outbound/signal-history-repository';

export interface ArchiveMarketSignalsDependencies {
  repository: SignalHistoryRepository;
  now: () => Date;
  formatSignalDate: (date: Date) => string;
}

export function createArchiveMarketSignals(dependencies: ArchiveMarketSignalsDependencies) {
  return (batch: MarketSignalBatch): number => {
    if (batch.signals.length === 0) return 0;
    dependencies.repository.ensureReady(batch.attributeNames);
    const existingKeys = dependencies.repository.loadExistingKeys();
    const now = dependencies.now();
    const signalDate = dependencies.formatSignalDate(now);
    const snapshots: SignalSnapshot[] = [];
    for (const signal of batch.signals) {
      const ticker = String(signal.ticker || '')
        .trim()
        .toUpperCase();
      if (!ticker) continue;
      const key = buildSignalKey(
        signalDate,
        batch.feed.strategyId,
        batch.feed.strategyVersion,
        ticker
      );
      if (existingKeys.has(key)) continue;
      snapshots.push({
        signalDate,
        detectedAt: now,
        strategyId: batch.feed.strategyId,
        strategyName: batch.feed.strategyName,
        strategyVersion: batch.feed.strategyVersion,
        ticker,
        attributes: Object.fromEntries(
          batch.attributeNames.map((name) => [name, signal.attributes[name]])
        )
      });
      existingKeys.add(key);
    }
    if (snapshots.length === 0) return 0;
    dependencies.repository.append(snapshots);
    return snapshots.length;
  };
}
