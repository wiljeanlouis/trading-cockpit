import type { SignalSnapshot } from '../../domain/market-signal';

export interface SignalHistoryRepository {
  ensureReady(attributeNames: string[]): void;
  loadExistingKeys(): Set<string>;
  append(snapshots: SignalSnapshot[]): void;
}
