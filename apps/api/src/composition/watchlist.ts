import {
  type AddMomentumCandidateToWatchlistRequest,
  type AddMomentumCandidateToWatchlistResponse,
  type WatchlistDto
} from '@trading-cockpit/contracts';
import { createAddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';
import { createGetWatchlist } from '@trading-cockpit/core/application/watchlist/get-watchlist';
import { createAddRankedMomentumCandidateToWatchlist } from '@trading-cockpit/core/application/momentum/add-ranked-momentum-candidate-to-watchlist';
import {
  LoadedMomentumRankingReader,
  LoadedWatchlistReader,
  readMomentumRankingRecords,
  readStrategyIds,
  readWatchlistEntries,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import {
  CloudRunWatchlistRepository,
  LoadedStrategyRepository,
  NodeRuntime
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import type { MutationDependencies } from './common';

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

export async function addMomentumCandidateToWatchlistForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<AddMomentumCandidateToWatchlistResponse> {
  await mutationContext.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.strategies
  ]);
  const watchlistRepository = await new CloudRunWatchlistRepository(mutationContext).load();
  const addCandidate = createAddCandidateToWatchlist({
    watchlistRepository,
    strategyRepository: new LoadedStrategyRepository(await readStrategyIds(mutationContext.sheets)),
    runtime: new NodeRuntime(mutationContext.now)
  });
  const addRankedCandidate = createAddRankedMomentumCandidateToWatchlist({
    rankingReader: new LoadedMomentumRankingReader(
      await readMomentumRankingRecords(mutationContext.sheets)
    ),
    addCandidateToWatchlist: addCandidate
  });
  return addRankedCandidate(body as unknown as AddMomentumCandidateToWatchlistRequest);
}
