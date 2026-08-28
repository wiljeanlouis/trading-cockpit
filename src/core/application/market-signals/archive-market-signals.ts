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
  observe?: (event: string, fields: Record<string, unknown>) => void;
}

export function createArchiveMarketSignals(dependencies: ArchiveMarketSignalsDependencies) {
  return (batch: MarketSignalBatch): number => {
    if (batch.signals.length === 0) {
      dependencies.observe?.('SIGNAL_SNAPSHOTS_PREPARED', { count: 0 });
      return 0;
    }
    let existingKeys: Set<string>;
    try {
      dependencies.repository.ensureReady(batch.attributeNames);
      existingKeys = dependencies.repository.loadExistingKeys();
    } catch (error) {
      dependencies.observe?.('TECHNICAL_FAILURE', {
        stage: 'SIGNAL_HISTORY_LOAD',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
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
    dependencies.observe?.('SIGNAL_SNAPSHOTS_PREPARED', { count: snapshots.length });
    if (snapshots.length === 0) return 0;
    try {
      dependencies.repository.append(snapshots);
    } catch (error) {
      dependencies.observe?.('TECHNICAL_FAILURE', {
        stage: 'SIGNAL_HISTORY_SAVE',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
    dependencies.observe?.('SIGNAL_HISTORY_APPENDED', { count: snapshots.length });
    return snapshots.length;
  };
}
