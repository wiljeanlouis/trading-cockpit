import { refreshMomentumRankingFromSheets } from '../adapters/inbound/google-sheets/ui/refresh-momentum-ranking';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-strategy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-repository';
import { GoogleSheetsWatchlistReader } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-reader';
import { GoogleSheetsMomentumRankingProjection } from '../adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-projection';
import { GoogleSheetsMomentumRankingReader } from '../adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-reader';
import {
  GoogleSheetsMomentumSignalRepository,
  GoogleSheetsMomentumStrategyRepository
} from '../adapters/outbound/google-sheets/momentum/google-sheets-momentum-signal-repository';
import type {
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  MomentumRankingDto
} from '@trading-cockpit/contracts';
import { createAddRankedMomentumCandidateToWatchlist } from '@trading-cockpit/core/application/momentum/add-ranked-momentum-candidate-to-watchlist';
import { createGetMomentumRanking } from '@trading-cockpit/core/application/momentum/get-momentum-ranking';
import { createRefreshMomentumRanking } from '@trading-cockpit/core/application/momentum/refresh-momentum-ranking';
import { createAddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';
import { RuntimeLogger } from '../adapters/outbound/apps-script/runtime-logger';

export function runRefreshMomentumRanking(): void {
  const logger = new RuntimeLogger('refresh-momentum-ranking');
  logger.start();
  try {
    const refresh = createRefreshMomentumRanking({
      signalRepository: new GoogleSheetsMomentumSignalRepository(),
      strategyRepository: new GoogleSheetsMomentumStrategyRepository(),
      rankingProjection: new GoogleSheetsMomentumRankingProjection(),
      observe: (event, fields) => logger.info(event, fields)
    });
    refreshMomentumRankingFromSheets(() => {
      const result = refresh();
      logger.success({ signalDate: result.signalDate, ranked: result.ranked.length });
      return result;
    });
  } catch (error) {
    logger.error('REFRESH_MOMENTUM_RANKING', error);
    throw error;
  }
}

export function runGetMomentumRanking(): MomentumRankingDto {
  return createGetMomentumRanking({
    reader: new GoogleSheetsMomentumRankingReader(),
    watchlistReader: new GoogleSheetsWatchlistReader(),
    now: () => new Date()
  })();
}

export function runAddMomentumCandidateToWatchlist(
  request: AddMomentumCandidateToWatchlistRequest
): AddMomentumCandidateToWatchlistResponse {
  const logger = new RuntimeLogger('add-momentum-candidate-to-watchlist');
  logger.start();
  try {
    const addCandidate = createAddCandidateToWatchlist({
      watchlistRepository: new GoogleSheetsWatchlistRepository(),
      strategyRepository: new GoogleSheetsStrategyRepository(),
      runtime: new AppsScriptRuntime()
    });
    const addRankedCandidate = createAddRankedMomentumCandidateToWatchlist({
      rankingReader: new GoogleSheetsMomentumRankingReader(),
      addCandidateToWatchlist: addCandidate
    });
    const result = addRankedCandidate(request);
    logger.success({
      kind: result.kind,
      watchlistId: result.watchlistId,
      ticker: result.ticker
    });
    return result;
  } catch (error) {
    logger.error('ADD_MOMENTUM_CANDIDATE_TO_WATCHLIST', error);
    throw error;
  }
}
