import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  TradingAccountsDto
} from '@trading-cockpit/contracts';
import type { CreateTradePlanFromWatchlist } from '@trading-cockpit/core/application/trade-plan/create-trade-plan-from-watchlist';
import type { TradingAccount } from '@trading-cockpit/core/domain/trading-account';

export function tradingAccountsToDto(accounts: TradingAccount[]): TradingAccountsDto {
  return {
    accounts: accounts.map(({ id, name, baseCurrency }) => ({ id, name, baseCurrency }))
  };
}

export function createTradePlanFromWeb(
  createTradePlan: CreateTradePlanFromWatchlist,
  request: CreateTradePlanRequest
): CreateTradePlanResponse {
  const result = createTradePlan({
    watchlistId: String(request?.watchlistId ?? ''),
    accountId: String(request?.accountId ?? ''),
    breakoutLevel: request?.breakoutLevel ?? null,
    invalidationLevel: request?.invalidationLevel ?? null,
    eventRisk: request?.eventRisk ?? null
  });

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
