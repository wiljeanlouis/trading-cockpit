import type { WatchlistEntry, WatchlistIdentity } from '../../domain/watchlist';

export interface WatchlistRepository {
  findById(id: string): WatchlistEntry | null;
  findActiveByIdentity(identity: WatchlistIdentity): WatchlistEntry | null;
  save(entry: WatchlistEntry): void;
  updateTradePlanningInputs(
    id: string,
    inputs: { breakoutLevel: number | null; invalidationLevel: number; eventRisk: string }
  ): void;
  updateStatus(id: string, status: string): void;
}
