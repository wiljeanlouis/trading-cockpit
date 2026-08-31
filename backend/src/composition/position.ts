import type {
  ClosePositionRequest,
  ClosePositionResponse,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  OpenPositionsDto
} from '@trading-cockpit/contracts';
import { closePositionFromWeb } from '../adapters/inbound/apps-script/close-position-from-web';
import { executeTradePlanFromWeb } from '../adapters/inbound/apps-script/execute-trade-plan-from-web';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsPositionRepository } from '../adapters/outbound/google-sheets/position/google-sheets-position-repository';
import { GoogleSheetsPositionReader } from '../adapters/outbound/google-sheets/position/google-sheets-position-reader';
import { GoogleSheetsJournalRepository } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-repository';
import { GoogleSheetsTradePlanRepository } from '../adapters/outbound/google-sheets/trade-plan/google-sheets-trade-plan-repository';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-strategy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-repository';
import {
  createOpenPositionFromTradePlan,
  type OpenPositionFromTradePlan
} from '@trading-cockpit/backend-core/application/position/open-position-from-trade-plan';
import {
  createClosePosition,
  type ClosePosition
} from '@trading-cockpit/backend-core/application/position/close-position';
import { createGetOpenPositions } from '@trading-cockpit/backend-core/application/position/get-open-positions';

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

export function createClosePositionUseCase(
  observe?: (event: string, fields: Record<string, unknown>) => void
): ClosePosition {
  return createClosePosition({
    positionRepository: new GoogleSheetsPositionRepository(),
    journalRepository: new GoogleSheetsJournalRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    runtime: new AppsScriptRuntime(),
    observe
  });
}

export function runGetOpenPositions(): OpenPositionsDto {
  return createGetOpenPositions({
    reader: new GoogleSheetsPositionReader(),
    now: () => new Date()
  })();
}

export function runClosePositionFromWeb(request: ClosePositionRequest): ClosePositionResponse {
  return closePositionFromWeb(createClosePositionUseCase(), request);
}
