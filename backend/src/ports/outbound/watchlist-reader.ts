import type { WatchlistEntry } from '../../core/domain/watchlist';

export interface WatchlistReader {
  findAll(): WatchlistEntry[];
}
