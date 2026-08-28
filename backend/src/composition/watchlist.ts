import { GoogleSheetsWatchlistReader } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-reader';
import { createGetWatchlist } from '../core/application/watchlist/get-watchlist';

export function runGetWatchlist() {
  return createGetWatchlist({
    reader: new GoogleSheetsWatchlistReader(),
    now: () => new Date()
  })();
}
