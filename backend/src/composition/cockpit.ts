import { createTradePlanFromSelectedWatchlistRow } from '../adapters/inbound/google-sheets/create-trade-plan-from-selected-watchlist';
import { executeSelectedTradePlanRow } from '../adapters/inbound/google-sheets/execute-selected-trade-plan';
import { closeSelectedPositionRow } from '../adapters/inbound/google-sheets/close-selected-position';
import { reconcileSelectedPositionRow } from '../adapters/inbound/google-sheets/reconcile-selected-position';
import { addSelectedRankingCandidateToWatchlist } from '../adapters/inbound/google-sheets/add-selected-to-watchlist';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { RuntimeLogger } from '../adapters/outbound/apps-script/runtime-logger';
import { setupTradingAccounts } from '../adapters/inbound/google-sheets/setup-trading-accounts';
import {
  recordDepositFromSheets,
  recordInitialFundingFromSheets,
  recordWithdrawalFromSheets
} from '../adapters/inbound/google-sheets/record-capital-transaction';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-strategy-repository';
import { GoogleSheetsPositionRepository } from '../adapters/outbound/google-sheets/position/google-sheets-position-repository';
import { GoogleSheetsJournalRepository } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-repository';
import { GoogleSheetsTradingAccountRepository } from '../adapters/outbound/google-sheets/trading-account/google-sheets-trading-account-repository';
import { GoogleSheetsCapitalTransactionRepository } from '../adapters/outbound/google-sheets/capital-transaction/google-sheets-capital-transaction-repository';
import { GoogleSheetsTradingAccountRiskPolicyRepository } from '../adapters/outbound/google-sheets/trading-account/google-sheets-trading-account-risk-policy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-repository';
import { createReconcileClosedPosition } from '../core/application/position/reconcile-closed-position';
import { createAddCandidateToWatchlist } from '../core/application/watchlist/add-candidate-to-watchlist';
import { createListTradingAccounts } from '../core/application/trading-account/list-trading-accounts';
import {
  createRecordDeposit,
  createRecordInitialFunding,
  createRecordWithdrawal,
  type RecordCapitalTransactionDependencies
} from '../core/application/trading-account/record-capital-transaction';
import { createTradePlanUseCase } from './trade-plan';
import { createClosePositionUseCase, createOpenPositionUseCase } from './position';

function isExpectedBlock(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(absent|introuvable|inconnue|désactivée|incohérente|doit être|déjà|aucun|aucune|sélectionne|insuffisant|invalide|n'est pas)/i.test(
    message
  );
}

function logFailure(logger: RuntimeLogger, stage: string, error: unknown): void {
  if (isExpectedBlock(error)) logger.blocked(error, { stage });
  else logger.error(stage, error);
}

export function runAddSelectedToWatchlist(): void {
  const logger = new RuntimeLogger('add-to-watchlist');
  logger.start();
  const addCandidateToWatchlist = createAddCandidateToWatchlist({
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    runtime: new AppsScriptRuntime()
  });

  try {
    addSelectedRankingCandidateToWatchlist((command) => {
      logger.info('CANDIDATE_SELECTED', {
        ticker: command.ticker,
        strategyId: command.strategyId,
        strategyVersion: command.strategyVersion,
        signalDate: command.signalDate
      });
      const result = addCandidateToWatchlist(command);
      if (result.kind === 'duplicate') {
        logger.warn('DUPLICATE', {
          ticker: result.identity.ticker,
          strategyId: result.identity.strategyId,
          watchlistId: result.existing.id
        });
      } else {
        logger.info('WATCHLIST_CREATED', { watchlistId: result.entry.id });
        logger.success({ watchlistId: result.entry.id });
      }
      return result;
    });
  } catch (error) {
    logFailure(logger, 'ADD_TO_WATCHLIST', error);
    throw error;
  }
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

function runCapitalWorkflow(
  workflow: string,
  run: (record: ReturnType<typeof createRecordDeposit>) => void,
  record: ReturnType<typeof createRecordDeposit>
): void {
  const logger = new RuntimeLogger(workflow);
  logger.start();
  try {
    run((command) => {
      logger.info('TRANSACTION_REQUESTED', {
        accountId: command.accountId,
        amount: command.amount
      });
      const transaction = record(command);
      logger.info('TRANSACTION_RECORDED', {
        accountId: transaction.accountId,
        transactionType: transaction.type,
        amount: transaction.amount,
        capitalTransactionId: transaction.id
      });
      logger.success({ capitalTransactionId: transaction.id });
      return transaction;
    });
  } catch (error) {
    logFailure(logger, 'CAPITAL_TRANSACTION_SAVE', error);
    throw error;
  }
}

export function runRecordInitialFunding(): void {
  runCapitalWorkflow(
    'record-initial-funding',
    recordInitialFundingFromSheets,
    createRecordInitialFunding(capitalDependencies())
  );
}

export function runRecordDeposit(): void {
  runCapitalWorkflow(
    'record-deposit',
    recordDepositFromSheets,
    createRecordDeposit(capitalDependencies())
  );
}

export function runRecordWithdrawal(): void {
  runCapitalWorkflow(
    'record-withdrawal',
    recordWithdrawalFromSheets,
    createRecordWithdrawal(capitalDependencies())
  );
}

export function runCreateTradePlanFromSelectedWatchlist(): void {
  const logger = new RuntimeLogger('create-trade-plan');
  logger.start();
  const createTradePlan = createTradePlanUseCase((event, fields) => logger.info(event, fields));

  try {
    createTradePlanFromSelectedWatchlistRow((command) => {
      logger.info('TRADE_PLAN_REQUESTED', {
        watchlistId: command.watchlistId,
        accountId: command.accountId
      });
      const result = createTradePlan(command);
      if (result.kind === 'duplicate') {
        logger.warn('DUPLICATE', {
          watchlistId: result.watchlistId,
          accountId: result.existing.accountId,
          tradePlanId: result.existing.id
        });
      } else {
        const plan = result.tradePlan;
        logger.info('TRADE_PLAN_CREATED', {
          tradePlanId: plan.id,
          accountId: plan.accountId,
          strategyId: plan.strategyId,
          equityBasis: 'REALIZED',
          realizedEquity: plan.accountEquity,
          riskPercent: plan.riskPercent,
          riskPerShare: plan.riskPerShare,
          maxRisk: plan.maxRisk,
          positionSize: plan.positionSize
        });
        logger.success({ tradePlanId: plan.id });
      }
      return result;
    });
  } catch (error) {
    logFailure(logger, 'TRADE_PLAN_SAVE', error);
    throw error;
  }
}

export function runExecuteSelectedTradePlan(): void {
  const logger = new RuntimeLogger('open-position');
  logger.start();
  const openPosition = createOpenPositionUseCase();

  try {
    executeSelectedTradePlanRow((command) => {
      logger.info('OPEN_POSITION_REQUESTED', { tradePlanId: command.tradePlanId });
      const result = openPosition(command);
      if (result.kind === 'duplicate') {
        logger.warn('DUPLICATE', {
          tradePlanId: result.tradePlanId,
          positionId: result.existing.id,
          accountId: result.existing.accountId,
          ticker: result.ticker
        });
      } else {
        const position = result.position;
        logger.info('POSITION_OPENED', {
          positionId: position.id,
          tradePlanId: position.tradePlanId,
          accountId: position.accountId,
          ticker: position.ticker,
          plannedQuantity: position.plannedQuantity,
          actualQuantity: position.actualQuantity,
          plannedEntry: position.plannedEntry,
          actualEntry: position.actualEntry
        });
        logger.success({ positionId: position.id });
      }
      return result;
    });
  } catch (error) {
    logFailure(logger, 'OPEN_POSITION', error);
    throw error;
  }
}

export function runCloseSelectedPosition(): void {
  const logger = new RuntimeLogger('close-position');
  logger.start();
  let technicalFailureLogged = false;
  const closePosition = createClosePositionUseCase((event, fields) => {
    if (event === 'PARTIAL_FAILURE' || event === 'TECHNICAL_FAILURE') {
      technicalFailureLogged = true;
      logger.error(
        String(fields.stage),
        new Error(String(fields.errorMessage || 'Runtime failure')),
        fields
      );
    } else logger.info(event, fields);
  });

  try {
    closeSelectedPositionRow((command) => {
      logger.info('CLOSE_REQUESTED', {
        positionId: command.positionId,
        exitPrice: command.exitPrice
      });
      const result = closePosition(command);
      logger.success({
        positionId: result.position.id,
        accountId: result.position.accountId,
        ticker: result.position.ticker,
        exitPrice: result.position.exitPrice,
        realizedPnl: result.position.realizedPnl,
        journalCreated: result.journalCreated
      });
      return result;
    });
  } catch (error) {
    if (!technicalFailureLogged) logFailure(logger, 'CLOSE_POSITION', error);
    throw error;
  }
}

export function runReconcileSelectedPosition(): void {
  const logger = new RuntimeLogger('reconcile-position');
  logger.start();
  let technicalFailureLogged = false;
  const reconcile = createReconcileClosedPosition({
    positionRepository: new GoogleSheetsPositionRepository(),
    journalRepository: new GoogleSheetsJournalRepository(),
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    runtime: new AppsScriptRuntime(),
    observe: (event, fields) => {
      if (event === 'TECHNICAL_FAILURE') {
        technicalFailureLogged = true;
        logger.error(
          String(fields.stage),
          new Error(String(fields.errorMessage || 'Runtime failure')),
          fields
        );
      } else logger.info(event, fields);
    }
  });

  try {
    reconcileSelectedPositionRow((command) => {
      logger.info('RECONCILIATION_REQUESTED', { positionId: command.positionId });
      const result = reconcile(command);
      const fields = {
        positionId: result.positionId,
        journal: result.journal,
        watchlist: result.watchlist,
        overall: result.status,
        diagnostics: result.diagnostics.length
      };
      if (result.status === 'BLOCKED' || result.status === 'NO_ACTION') {
        logger.warn(result.status, fields);
      } else logger.success(fields);
      return result;
    });
  } catch (error) {
    if (!technicalFailureLogged) logFailure(logger, 'RECONCILIATION', error);
    throw error;
  }
}
