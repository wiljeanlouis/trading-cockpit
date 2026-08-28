import type { SignalSnapshot } from '../../core/domain/market-signal';

export interface SignalHistoryRepository {
  ensureReady(attributeNames: string[]): void;
  loadExistingKeys(): Set<string>;
  append(snapshots: SignalSnapshot[]): void;
}
