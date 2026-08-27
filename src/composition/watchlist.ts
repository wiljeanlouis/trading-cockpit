import { addSelectedRankingCandidateToWatchlist } from '../adapters/inbound/google-sheets/add-selected-to-watchlist';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/google-sheets-strategy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/google-sheets-watchlist-repository';
import { createAddCandidateToWatchlist } from '../core/application/watchlist/add-candidate-to-watchlist';

export function runAddSelectedToWatchlist(): void {
  const addCandidateToWatchlist = createAddCandidateToWatchlist({
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });

  addSelectedRankingCandidateToWatchlist(addCandidateToWatchlist);
}
