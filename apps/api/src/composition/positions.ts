import { createGetOpenPositions } from '@trading-cockpit/core/application/position/get-open-positions';
import { createOpenPositionFromTradePlan } from '@trading-cockpit/core/application/position/open-position-from-trade-plan';
import { createClosePosition } from '@trading-cockpit/core/application/position/close-position';
import type {
  ClosePositionResponse,
  ExecuteTradePlanResponse,
  OpenPositionsDto
} from '@trading-cockpit/contracts';
import {
  LoadedPositionReader,
  readPositions
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import {
  loadMutationRepositories,
  NodeRuntime
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  requiredNumber,
  requiredText,
  nullableNumber,
  serializedDate,
  type MutationDependencies
} from './common';

export async function getOpenPositionsForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<OpenPositionsDto> {
  return createGetOpenPositions({
    reader: new LoadedPositionReader(await readPositions(dependencies.sheets)),
    now: dependencies.now
  })();
}

export async function executeTradePlanForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<ExecuteTradePlanResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const result = createOpenPositionFromTradePlan({
    positionRepository: repositories.positionRepository,
    tradePlanRepository: repositories.tradePlanRepository,
    watchlistRepository: repositories.watchlistRepository,
    strategyRepository: repositories.strategyRepository,
    runtime: new NodeRuntime(mutationContext.now)
  })({ tradePlanId: requiredText(body.tradePlanId, 'tradePlanId') });
  const position = result.kind === 'opened' ? result.position : result.existing;
  return {
    kind: result.kind,
    positionId: position.id,
    tradePlanId: position.tradePlanId,
    accountId: position.accountId,
    ticker: position.ticker,
    openedAt: serializedDate(position.openedAt),
    actualEntry: nullableNumber(position.actualEntry),
    actualQuantity: nullableNumber(position.actualQuantity),
    positionStatus: position.status
  };
}

export async function closePositionForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<ClosePositionResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const result = createClosePosition({
    positionRepository: repositories.positionRepository,
    journalRepository: repositories.journalRepository,
    watchlistRepository: repositories.watchlistRepository,
    runtime: new NodeRuntime(mutationContext.now)
  })({
    positionId: requiredText(body.positionId, 'positionId'),
    exitPrice: requiredNumber(body.exitPrice, 'exitPrice')
  });
  return {
    positionId: result.position.id,
    accountId: result.position.accountId,
    ticker: result.position.ticker,
    status: result.position.status,
    closedAt: serializedDate(result.position.closedAt),
    exitPrice: Number(result.position.exitPrice),
    realizedPnl: nullableNumber(result.position.realizedPnl),
    journalCreated: result.journalCreated
  };
}
