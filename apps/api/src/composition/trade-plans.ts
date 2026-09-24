import { createGetTradePlans } from '@trading-cockpit/core/application/trade-plan/get-trade-plans';
import { createCreateTradePlanFromWatchlist } from '@trading-cockpit/core/application/trade-plan/create-trade-plan-from-watchlist';
import { createUpdateTradePlanPlanning } from '@trading-cockpit/core/application/trade-plan/update-trade-plan-planning';
import { createGetAccountEquity } from '@trading-cockpit/core/application/trading-account/get-account-equity';
import type {
  CreateTradePlanResponse,
  TradePlansDto,
  UpdateTradePlanPlanningResponse
} from '@trading-cockpit/contracts';
import {
  LoadedTradePlanReader,
  readStrategyIds,
  readTradePlans,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import {
  CloudRunTradePlanRepository,
  loadMutationRepositories,
  NodeRuntime
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import { requiredNumber, requiredText, optionalNumber, type MutationDependencies } from './common';

export async function getTradePlansForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<TradePlansDto> {
  await dependencies.sheets.batchLoad([SHEET_DEFINITIONS.tradePlans, SHEET_DEFINITIONS.strategies]);
  const strategyIds = await readStrategyIds(dependencies.sheets);
  return createGetTradePlans({
    reader: new LoadedTradePlanReader(await readTradePlans(dependencies.sheets)),
    strategyIds: () => strategyIds,
    now: dependencies.now
  })();
}

export async function createTradePlanForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<CreateTradePlanResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const getAccountEquity = createGetAccountEquity({
    tradingAccountRepository: repositories.tradingAccountRepository,
    capitalTransactionRepository: repositories.capitalTransactionRepository,
    journalRepository: repositories.journalRepository
  });
  const result = createCreateTradePlanFromWatchlist({
    watchlistRepository: repositories.watchlistRepository,
    tradePlanRepository: repositories.tradePlanRepository,
    strategyRepository: repositories.strategyRepository,
    tradingAccountRepository: repositories.tradingAccountRepository,
    tradingAccountRiskPolicyRepository: repositories.tradingAccountRiskPolicyRepository,
    getAccountEquity,
    runtime: new NodeRuntime(mutationContext.now)
  })(body as never);
  const tradePlan = result.kind === 'created' ? result.tradePlan : result.existing;
  return {
    kind: result.kind,
    tradePlanId: tradePlan.id,
    watchlistId: tradePlan.watchlistId,
    ticker: tradePlan.ticker,
    accountId: tradePlan.accountId,
    status: tradePlan.status
  };
}

export async function updateTradePlanPlanningForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<UpdateTradePlanPlanningResponse> {
  const repository = await new CloudRunTradePlanRepository(mutationContext).load();
  const update = createUpdateTradePlanPlanning(repository);
  const tradePlan = update({
    tradePlanId: requiredText(body.tradePlanId, 'tradePlanId'),
    entryPrice: requiredNumber(body.entryPrice, 'entryPrice'),
    stopPrice: requiredNumber(body.stopPrice, 'stopPrice'),
    targetPrice: optionalNumber(body.targetPrice, 'targetPrice'),
    positionSize: optionalNumber(body.positionSize, 'positionSize')
  });
  return { tradePlanId: tradePlan.id, status: tradePlan.status };
}
