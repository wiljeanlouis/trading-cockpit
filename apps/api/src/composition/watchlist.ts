import type { WatchlistDto } from '@trading-cockpit/contracts';
import { createGetWatchlist } from '@trading-cockpit/core/application/watchlist/get-watchlist';
import {
  LoadedWatchlistReader,
  readWatchlistEntries
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getWatchlistForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<WatchlistDto> {
  const reader = new LoadedWatchlistReader(await readWatchlistEntries(dependencies.sheets));
  const getWatchlist = createGetWatchlist({
    reader,
    now: dependencies.now
  });

  return getWatchlist();
}
