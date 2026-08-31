import type { CloudRunHttpResponse } from '../../app';
import type { SheetsValuesClient } from '../../adapters/outbound/google-sheets-api/google-sheets-api-client';
import { createGetWatchlist } from '@trading-cockpit/core/application/watchlist/get-watchlist';
import {
  LoadedWatchlistReader,
  readWatchlistEntries
} from '../../adapters/outbound/google-sheets-api/cockpit-query-readers';
import { handleTimedQuery } from './query-route';
import type { RequestContext } from '../request-context';

export async function handleGetWatchlist(dependencies: {
  context: RequestContext;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  spreadsheetId: string;
  now: () => Date;
}): Promise<CloudRunHttpResponse> {
  return handleTimedQuery({
    ...dependencies,
    query: async ({ sheets, now }) =>
      createGetWatchlist({
        reader: new LoadedWatchlistReader(await readWatchlistEntries(sheets)),
        now
      })(),
    itemCount: (dto) => dto.items.length
  });
}
