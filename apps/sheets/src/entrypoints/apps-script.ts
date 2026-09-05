import {
  runAddSelectedToWatchlist,
  runCreateTradePlanFromSelectedWatchlist,
  runCloseSelectedPosition,
  runReconcileSelectedPosition,
  runExecuteSelectedTradePlan,
  runRecordCapitalTransaction,
  runRecordInitialFunding,
  runRecordDeposit,
  runRecordWithdrawal
} from '../composition/cockpit';
import { installCockpitMenu } from '../adapters/inbound/google-sheets/ui/install-cockpit-menu';
import { refreshDocumentation as refreshDocumentationSheet } from '../adapters/inbound/google-sheets/documentation/documentation';
import { applyCockpitTheme as applyCockpitThemeToSheets } from '../adapters/inbound/google-sheets/theme/theme';
import {
  runAddMomentumCandidateToWatchlist,
  runGetMomentumRanking,
  runRefreshMomentumRanking
} from '../composition/momentum';
import {
  runCheckFinvizAuth,
  runConfigureFinvizToken,
  runDeleteFinvizToken,
  runGetFinvizToken,
  runRefreshFinviz,
  runSetFinvizToken
} from '../composition/finviz';
import type {
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  OpenPositionsDto,
  JournalDto,
  MomentumRankingDto,
  TradePlansDto,
  TradingAccountsDto,
  WatchlistDto,
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse
} from '@trading-cockpit/contracts';
import { rememberActiveTradingCockpitSpreadsheet } from '../adapters/outbound/google-sheets/trading-cockpit-spreadsheet';
import { runGetWatchlist } from '../composition/watchlist';
import {
  runCreateTradePlanFromWeb,
  runGetTradePlans,
  runListTradingAccountsForWeb,
  runUpdateTradePlanPlanningFromWeb
} from '../composition/trade-plan';
import {
  runClosePositionFromWeb,
  runExecuteTradePlanFromWeb,
  runGetOpenPositions
} from '../composition/position';
import { runGetJournal } from '../composition/journal';
import { runInitializeTradingCockpit, runValidateTradingCockpit } from '../composition/workbook';
import type { WorkbookSetupReport } from '../adapters/inbound/google-sheets/ui/trading-cockpit-workbook';

export function getWatchlist(): WatchlistDto {
  return runGetWatchlist();
}

export function getMomentumRanking(): MomentumRankingDto {
  return runGetMomentumRanking();
}

export function addMomentumCandidateToWatchlist(
  request: AddMomentumCandidateToWatchlistRequest
): AddMomentumCandidateToWatchlistResponse {
  return runAddMomentumCandidateToWatchlist(request);
}

export function getTradingAccounts(): TradingAccountsDto {
  return runListTradingAccountsForWeb();
}

export function createTradePlan(request: CreateTradePlanRequest): CreateTradePlanResponse {
  return runCreateTradePlanFromWeb(request);
}

export function getTradePlans(): TradePlansDto {
  return runGetTradePlans();
}

export function executeTradePlan(request: ExecuteTradePlanRequest): ExecuteTradePlanResponse {
  return runExecuteTradePlanFromWeb(request);
}

export function updateTradePlanPlanning(
  request: UpdateTradePlanPlanningRequest
): UpdateTradePlanPlanningResponse {
  return runUpdateTradePlanPlanningFromWeb(request);
}

export function getOpenPositions(): OpenPositionsDto {
  return runGetOpenPositions();
}

export function closePosition(request: ClosePositionRequest): ClosePositionResponse {
  return runClosePositionFromWeb(request);
}

export function getJournal(): JournalDto {
  return runGetJournal();
}

export function onOpen(): void {
  installCockpitMenu();
  rememberActiveTradingCockpitSpreadsheet();
}

export function refreshMomentumRanking(): void {
  runRefreshMomentumRanking();
}

export function initializeTradingCockpit(): WorkbookSetupReport {
  return runInitializeTradingCockpit();
}

export function validateTradingCockpit(): WorkbookSetupReport {
  return runValidateTradingCockpit();
}

export function refreshFinviz(): number {
  return runRefreshFinviz();
}

export function configureFinvizToken(): void {
  runConfigureFinvizToken();
}

export function getFinvizToken(): string {
  return runGetFinvizToken();
}

export function setFinvizToken(token: unknown): void {
  runSetFinvizToken(token);
}

export function checkFinvizAuth(): boolean {
  return runCheckFinvizAuth();
}

export function deleteFinvizToken(): void {
  runDeleteFinvizToken();
}

export function addSelectedToWatchlist(): void {
  runAddSelectedToWatchlist();
}

export function createTradePlanFromSelectedWatchlist(): void {
  runCreateTradePlanFromSelectedWatchlist();
}

export function executeSelectedTradePlan(): void {
  runExecuteSelectedTradePlan();
}

export function closeSelectedPosition(): void {
  runCloseSelectedPosition();
}

export function reconcileSelectedPosition(): void {
  runReconcileSelectedPosition();
}

export function recordCapitalTransaction(
  request: RecordCapitalTransactionRequest
): RecordCapitalTransactionResponse {
  const transaction = runRecordCapitalTransaction({
    ...request,
    note: request.note ?? undefined
  });
  return {
    transactionId: transaction.id,
    accountId: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    occurredAt: transaction.occurredAt.toISOString(),
    note: transaction.note
  };
}

export function recordInitialFunding(): void {
  runRecordInitialFunding();
}

export function recordDeposit(): void {
  runRecordDeposit();
}

export function recordWithdrawal(): void {
  runRecordWithdrawal();
}

export function applyCockpitTheme(): void {
  applyCockpitThemeToSheets();
}

export function refreshDocumentation(): void {
  refreshDocumentationSheet();
}
