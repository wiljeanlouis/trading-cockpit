import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  TradePlansDto,
  TradingAccountsDto
} from '@trading-cockpit/contracts';
import {
  createTradePlanFromWeb,
  tradingAccountsToDto
} from '../adapters/inbound/apps-script/create-trade-plan-from-web';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { GoogleSheetsCapitalTransactionRepository } from '../adapters/outbound/google-sheets/capital-transaction/google-sheets-capital-transaction-repository';
import { GoogleSheetsJournalRepository } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-repository';
import { GoogleSheetsTradePlanRepository } from '../adapters/outbound/google-sheets/trade-plan/google-sheets-trade-plan-repository';
import { GoogleSheetsTradePlanReader } from '../adapters/outbound/google-sheets/trade-plan/google-sheets-trade-plan-reader';
import { GoogleSheetsTradingAccountRepository } from '../adapters/outbound/google-sheets/trading-account/google-sheets-trading-account-repository';
import { GoogleSheetsTradingAccountRiskPolicyRepository } from '../adapters/outbound/google-sheets/trading-account/google-sheets-trading-account-risk-policy-repository';
import { GoogleSheetsStrategyRepository } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-strategy-repository';
import { GoogleSheetsWatchlistRepository } from '../adapters/outbound/google-sheets/watchlist/google-sheets-watchlist-repository';
import {
  createCreateTradePlanFromWatchlist,
  type CreateTradePlanFromWatchlist
} from '../core/application/trade-plan/create-trade-plan-from-watchlist';
import { createGetAccountEquity } from '../core/application/trading-account/get-account-equity';
import { createListTradingAccounts } from '../core/application/trading-account/list-trading-accounts';
import { createGetTradePlans } from '../core/application/trade-plan/get-trade-plans';

type Observe = (event: string, fields: Record<string, unknown>) => void;

export function createTradePlanUseCase(observe?: Observe): CreateTradePlanFromWatchlist {
  const tradingAccountRepository = new GoogleSheetsTradingAccountRepository();
  return createCreateTradePlanFromWatchlist({
    watchlistRepository: new GoogleSheetsWatchlistRepository(),
    tradePlanRepository: new GoogleSheetsTradePlanRepository(),
    strategyRepository: new GoogleSheetsStrategyRepository(),
    tradingAccountRepository,
    tradingAccountRiskPolicyRepository: new GoogleSheetsTradingAccountRiskPolicyRepository(),
    getAccountEquity: createGetAccountEquity({
      tradingAccountRepository,
      capitalTransactionRepository: new GoogleSheetsCapitalTransactionRepository(),
      journalRepository: new GoogleSheetsJournalRepository(),
      observe
    }),
    runtime: new AppsScriptRuntime()
  });
}

export function runListTradingAccountsForWeb(): TradingAccountsDto {
  return tradingAccountsToDto(
    createListTradingAccounts(new GoogleSheetsTradingAccountRepository())()
  );
}

export function runCreateTradePlanFromWeb(
  request: CreateTradePlanRequest
): CreateTradePlanResponse {
  return createTradePlanFromWeb(createTradePlanUseCase(), request);
}

export function runGetTradePlans(): TradePlansDto {
  return createGetTradePlans({
    reader: new GoogleSheetsTradePlanReader(),
    now: () => new Date()
  })();
}
