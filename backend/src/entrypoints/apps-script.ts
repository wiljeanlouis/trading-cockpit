import {
  runAddSelectedToWatchlist,
  runCreateTradePlanFromSelectedWatchlist,
  runCloseSelectedPosition,
  runReconcileSelectedPosition,
  runExecuteSelectedTradePlan,
  runSetupTradingAccounts,
  runRecordInitialFunding,
  runRecordDeposit,
  runRecordWithdrawal
} from '../composition/cockpit';
import { installCockpitMenu } from '../adapters/inbound/google-sheets/install-cockpit-menu';
import { runRefreshMomentumRanking } from '../composition/momentum';
import {
  runSetupMomentumRanking,
  runSetupStrategies,
  runValidateStrategies
} from '../composition/legacy-setup';
import {
  runGetLegacyTradingConfiguration,
  runSetupCockpitConfiguration
} from '../composition/configuration';
import {
  runCheckFinvizAuth,
  runConfigureFinvizToken,
  runDeleteFinvizToken,
  runGetFinvizToken,
  runRefreshFinviz,
  runSetFinvizToken
} from '../composition/finviz';
import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  TradePlansDto,
  TradingAccountsDto,
  WatchlistDto
} from '@trading-cockpit/contracts';
import { serveReactCockpit } from '../adapters/inbound/apps-script/serve-react-cockpit';
import { runGetDashboardSummary } from '../composition/dashboard';
import { rememberActiveTradingCockpitSpreadsheet } from '../adapters/outbound/google-sheets/trading-cockpit-spreadsheet';
import { runGetWatchlist } from '../composition/watchlist';
import {
  runCreateTradePlanFromWeb,
  runGetTradePlans,
  runListTradingAccountsForWeb
} from '../composition/trade-plan';
import { runExecuteTradePlanFromWeb } from '../composition/position';

export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return serveReactCockpit();
}

export function getDashboardSummary(): DashboardSummaryDto {
  return runGetDashboardSummary();
}

export function getWatchlist(): WatchlistDto {
  return runGetWatchlist();
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

export function onOpen(): void {
  installCockpitMenu();
  rememberActiveTradingCockpitSpreadsheet();
}

export function refreshMomentumRanking(): void {
  runRefreshMomentumRanking();
}

export function setupMomentumRanking(): void {
  runSetupMomentumRanking();
}

export function setupStrategies(): void {
  runSetupStrategies();
}

export function validateStrategies(): true {
  return runValidateStrategies();
}

export function setupCockpitConfig(): void {
  runSetupCockpitConfiguration();
}

export function getTradingConfig() {
  return runGetLegacyTradingConfiguration();
}

export function refreshFinviz(): void {
  runRefreshFinviz();
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

export function setupTradingAccounts(): void {
  runSetupTradingAccounts();
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
