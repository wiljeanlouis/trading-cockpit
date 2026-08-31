import type { WatchlistEntry } from '../../domain/watchlist';

export interface WatchlistReader {
  findAll(): WatchlistEntry[];
}
