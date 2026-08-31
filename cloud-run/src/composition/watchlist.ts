import type { WatchlistDto } from '@trading-cockpit/contracts';
import { createGetWatchlist } from '@trading-cockpit/backend-core/application/watchlist/get-watchlist';
import type { SheetsValuesClient } from '../adapters/outbound/google-sheets-api/google-sheets-api-client';
import {
  LoadedWatchlistReader,
  readWatchlistEntries
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import { createQueryContext } from './query-context';

export interface CloudRunWatchlistResult {
  dto: WatchlistDto;
  timings: {
    sheetsMs: number;
    mappingMs: number;
  };
}

export async function getWatchlistForCloudRun(dependencies: {
  sheetsClient: SheetsValuesClient;
  spreadsheetId: string;
  now: () => Date;
}): Promise<CloudRunWatchlistResult> {
  const sheets = createQueryContext({
    sheetsClient: dependencies.sheetsClient,
    spreadsheetId: dependencies.spreadsheetId
  });
  const reader = new LoadedWatchlistReader(await readWatchlistEntries(sheets));
  const getWatchlist = createGetWatchlist({
    reader,
    now: dependencies.now
  });

  return {
    dto: getWatchlist(),
    timings: sheets.timings()
  };
}
