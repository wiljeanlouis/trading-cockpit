import type { WatchlistEntry, WatchlistIdentity } from '../../core/domain/watchlist';

export interface WatchlistRepository {
  findById(id: string): WatchlistEntry | null;
  findActiveByIdentity(identity: WatchlistIdentity): WatchlistEntry | null;
  save(entry: WatchlistEntry): void;
  updateStatus(id: string, status: string): void;
}
