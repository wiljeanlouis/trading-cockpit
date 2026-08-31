import { createGetMomentumRanking } from '@trading-cockpit/backend-core/application/momentum/get-momentum-ranking';
import type { MomentumRankingDto } from '@trading-cockpit/contracts';
import {
  LoadedMomentumRankingReader,
  LoadedWatchlistReader,
  readMomentumRankingRecords,
  readWatchlistEntries,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getMomentumRankingForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<MomentumRankingDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist
  ]);
  return createGetMomentumRanking({
    reader: new LoadedMomentumRankingReader(await readMomentumRankingRecords(dependencies.sheets)),
    watchlistReader: new LoadedWatchlistReader(await readWatchlistEntries(dependencies.sheets)),
    now: dependencies.now
  })();
}
