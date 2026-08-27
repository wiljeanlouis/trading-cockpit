import type { WatchlistEntry, WatchlistIdentity } from '../../core/domain/watchlist';

export interface WatchlistRepository {
  findActiveByIdentity(identity: WatchlistIdentity): WatchlistEntry | null;
  save(entry: WatchlistEntry): void;
}
