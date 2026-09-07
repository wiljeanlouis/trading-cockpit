import {
  type AddDiscoveryCandidateToWatchlistRequest,
  type AddDiscoveryCandidateToWatchlistResponse,
  type WatchlistDto
} from '@trading-cockpit/contracts';
import { createAddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';
import { createGetWatchlist } from '@trading-cockpit/core/application/watchlist/get-watchlist';
import { createAddDiscoveryCandidateToWatchlist } from '@trading-cockpit/core/application/discovery/add-discovery-candidate-to-watchlist';
import {
  LoadedDiscoverySignalReader,
  LoadedWatchlistReader,
  readSignalSnapshots,
  readStrategyRecords,
  readStrategyVersionRecords,
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

export async function addDiscoveryCandidateToWatchlistForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<AddDiscoveryCandidateToWatchlistResponse> {
  await mutationContext.sheets.batchLoad([
    SHEET_DEFINITIONS.signalsHistory,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.strategyVersions
  ]);
  const watchlistRepository = await new CloudRunWatchlistRepository(mutationContext).load();
  const addCandidate = createAddCandidateToWatchlist({
    watchlistRepository,
    strategyRepository: new LoadedStrategyRepository(
      await readStrategyRecords(mutationContext.sheets),
      await readStrategyVersionRecords(mutationContext.sheets)
    ),
    runtime: new NodeRuntime(mutationContext.now)
  });
  const addDiscoveryCandidate = createAddDiscoveryCandidateToWatchlist({
    signalReader: new LoadedDiscoverySignalReader(
      await readSignalSnapshots(mutationContext.sheets),
      await readStrategyRecords(mutationContext.sheets),
      await readStrategyVersionRecords(mutationContext.sheets)
    ),
    addCandidateToWatchlist: addCandidate
  });
  return addDiscoveryCandidate(body as unknown as AddDiscoveryCandidateToWatchlistRequest);
}
