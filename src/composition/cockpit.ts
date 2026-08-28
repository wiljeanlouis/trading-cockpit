import { createTradePlanFromSelectedWatchlistRow } from '../adapters/inbound/google-sheets/create-trade-plan-from-selected-watchlist';
import { executeSelectedTradePlanRow } from '../adapters/inbound/google-sheets/execute-selected-trade-plan';
import { closeSelectedPositionRow } from '../adapters/inbound/google-sheets/close-selected-position';
import { reconcileSelectedPositionRow } from '../adapters/inbound/google-sheets/reconcile-selected-position';
import { addSelectedRankingCandidateToWatchlist } from '../adapters/inbound/google-sheets/add-selected-to-watchlist';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { setupTradingAccounts } from '../adapters/inbound/google-sheets/setup-trading-accounts';
import {
  recordDepositFromSheets,
  recordInitialFundingFromSheets,
  recordWithdrawalFromSheets
} from '../adapters/inbound/google-sheets/record-capital-transaction';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/google-sheets-strategy-repository';
import { GoogleSheetsPositionRepository } from '../adapters/outbound/google-sheets/google-sheets-position-repository';
import { GoogleSheetsJournalRepository } from '../adapters/outbound/google-sheets/google-sheets-journal-repository';
import { GoogleSheetsTradePlanRepository } from '../adapters/outbound/google-sheets/google-sheets-trade-plan-repository';
import { GoogleSheetsTradingConfiguration } from '../adapters/outbound/google-sheets/google-sheets-trading-configuration';
import { GoogleSheetsTradingAccountRepository } from '../adapters/outbound/google-sheets/google-sheets-trading-account-repository';
import { GoogleSheetsCapitalTransactionRepository } from '../adapters/outbound/google-sheets/google-sheets-capital-transaction-repository';
import { GoogleSheetsTradingAccountRiskPolicyRepository } from '../adapters/outbound/google-sheets/google-sheets-trading-account-risk-policy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/google-sheets-watchlist-repository';
import { createCreateTradePlanFromWatchlist } from '../core/application/trade-plan/create-trade-plan-from-watchlist';
import { createOpenPositionFromTradePlan } from '../core/application/position/open-position-from-trade-plan';
import { createClosePosition } from '../core/application/position/close-position';
import { createReconcileClosedPosition } from '../core/application/position/reconcile-closed-position';
import { createAddCandidateToWatchlist } from '../core/application/watchlist/add-candidate-to-watchlist';
import { createListTradingAccounts } from '../core/application/trading-account/list-trading-accounts';
import {
  createRecordDeposit,
  createRecordInitialFunding,
  createRecordWithdrawal,
  type RecordCapitalTransactionDependencies
} from '../core/application/trading-account/record-capital-transaction';

export function runAddSelectedToWatchlist(): void {
  const addCandidateToWatchlist = createAddCandidateToWatchlist({
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });

  addSelectedRankingCandidateToWatchlist(addCandidateToWatchlist);
}

export function runSetupTradingAccounts(): void {
  const ledger = new GoogleSheetsCapitalTransactionRepository();
  const riskPolicies = new GoogleSheetsTradingAccountRiskPolicyRepository();
  setupTradingAccounts(
    createListTradingAccounts(new GoogleSheetsTradingAccountRepository()),
    () => ledger.ensureReady(),
    () => riskPolicies.ensureReady()
  );
}

function capitalDependencies(): RecordCapitalTransactionDependencies {
  return {
    tradingAccountRepository: new GoogleSheetsTradingAccountRepository(),
    capitalTransactionRepository: new GoogleSheetsCapitalTransactionRepository(),
    runtime: new AppsScriptRuntime()
  };
}

export function runRecordInitialFunding(): void {
  recordInitialFundingFromSheets(createRecordInitialFunding(capitalDependencies()));
}

export function runRecordDeposit(): void {
  recordDepositFromSheets(createRecordDeposit(capitalDependencies()));
}

export function runRecordWithdrawal(): void {
  recordWithdrawalFromSheets(createRecordWithdrawal(capitalDependencies()));
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
    runtime: new AppsScriptRuntime(),
    tradingAccountRepository: new GoogleSheetsTradingAccountRepository()
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

export function runReconcileSelectedPosition(): void {
  const reconcile = createReconcileClosedPosition({
    positionRepository: new GoogleSheetsPositionRepository(),
    journalRepository: new GoogleSheetsJournalRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    runtime: new AppsScriptRuntime()
  });

  reconcileSelectedPositionRow(reconcile);
}
