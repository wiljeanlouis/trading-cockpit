import type { ExecuteTradePlanRequest, ExecuteTradePlanResponse } from '@trading-cockpit/contracts';
import { executeTradePlanFromWeb } from '../adapters/inbound/apps-script/execute-trade-plan-from-web';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsPositionRepository } from '../adapters/outbound/google-sheets/position/google-sheets-position-repository';
import { GoogleSheetsTradePlanRepository } from '../adapters/outbound/google-sheets/trade-plan/google-sheets-trade-plan-repository';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-strategy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-repository';
import {
  createOpenPositionFromTradePlan,
  type OpenPositionFromTradePlan
} from '../core/application/position/open-position-from-trade-plan';

export function createOpenPositionUseCase(): OpenPositionFromTradePlan {
  return createOpenPositionFromTradePlan({
    positionRepository: new GoogleSheetsPositionRepository(),
    tradePlanRepository: new GoogleSheetsTradePlanRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });
}

export function runExecuteTradePlanFromWeb(
  request: ExecuteTradePlanRequest
): ExecuteTradePlanResponse {
  return executeTradePlanFromWeb(createOpenPositionUseCase(), request);
}
