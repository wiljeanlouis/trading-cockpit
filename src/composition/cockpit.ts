import { createTradePlanFromSelectedWatchlistRow } from '../adapters/inbound/google-sheets/create-trade-plan-from-selected-watchlist';
import { executeSelectedTradePlanRow } from '../adapters/inbound/google-sheets/execute-selected-trade-plan';
import { closeSelectedPositionRow } from '../adapters/inbound/google-sheets/close-selected-position';
import { addSelectedRankingCandidateToWatchlist } from '../adapters/inbound/google-sheets/add-selected-to-watchlist';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/google-sheets-strategy-repository';
import { GoogleSheetsPositionRepository } from '../adapters/outbound/google-sheets/google-sheets-position-repository';
import { GoogleSheetsJournalRepository } from '../adapters/outbound/google-sheets/google-sheets-journal-repository';
import { GoogleSheetsTradePlanRepository } from '../adapters/outbound/google-sheets/google-sheets-trade-plan-repository';
import { GoogleSheetsTradingConfiguration } from '../adapters/outbound/google-sheets/google-sheets-trading-configuration';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/google-sheets-watchlist-repository';
import { createCreateTradePlanFromWatchlist } from '../core/application/trade-plan/create-trade-plan-from-watchlist';
import { createOpenPositionFromTradePlan } from '../core/application/position/open-position-from-trade-plan';
import { createClosePosition } from '../core/application/position/close-position';
import { createAddCandidateToWatchlist } from '../core/application/watchlist/add-candidate-to-watchlist';

export function runAddSelectedToWatchlist(): void {
  const addCandidateToWatchlist = createAddCandidateToWatchlist({
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });

  addSelectedRankingCandidateToWatchlist(addCandidateToWatchlist);
}

export function runCreateTradePlanFromSelectedWatchlist(): void {
  const watchlistRepository = new GoogleSheetsWatchlistRepository();
  const createTradePlan = createCreateTradePlanFromWatchlist({
    watchlistRepository,
    tradePlanRepository: new GoogleSheetsTradePlanRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    tradingConfiguration: new GoogleSheetsTradingConfiguration(),
    runtime: new AppsScriptRuntime()
  });

  createTradePlanFromSelectedWatchlistRow(createTradePlan);
}

export function runExecuteSelectedTradePlan(): void {
  const openPosition = createOpenPositionFromTradePlan({
    positionRepository: new GoogleSheetsPositionRepository(),
    tradePlanRepository: new GoogleSheetsTradePlanRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });

  executeSelectedTradePlanRow(openPosition);
}

export function runCloseSelectedPosition(): void {
  const closePosition = createClosePosition({
    positionRepository: new GoogleSheetsPositionRepository(),
    journalRepository: new GoogleSheetsJournalRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    runtime: new AppsScriptRuntime()
  });

  closeSelectedPositionRow(closePosition);
}
