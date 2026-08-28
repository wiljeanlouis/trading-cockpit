export interface TradingAccountDto {
  id: string;
  name: string;
  baseCurrency: string;
}

export interface TradingAccountsDto {
  accounts: TradingAccountDto[];
}

export interface CreateTradePlanRequest {
  watchlistId: string;
  accountId: string;
}

export type CreateTradePlanResponse =
  | {
      kind: 'created';
      tradePlanId: string;
      watchlistId: string;
      ticker: string;
      accountId: string;
      status: string;
    }
  | {
      kind: 'duplicate';
      tradePlanId: string;
      watchlistId: string;
      ticker: string;
      accountId: string;
      status: string;
    };

export interface TradePlanItemDto {
  id: string;
  watchlistId: string;
  accountId: string;
  ticker: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: string | null;
  signalPrice: number | null;
  referencePrice: number | null;
  momentumScore: number | null;
  setupStatus: string | null;
  breakoutLevel: number | null;
  invalidationLevel: number | null;
  eventRisk: string | null;
  createdAt: string | null;
  entryType: string | null;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  riskPerShare: number | null;
  rewardPerShare: number | null;
  riskReward: number | null;
  accountEquity: number | null;
  riskPercent: number | null;
  maxRisk: number | null;
  positionSize: number | null;
  positionValue: number | null;
  status: string;
  notes: string | null;
}

export interface TradePlansDto {
  generatedAt: string;
  items: TradePlanItemDto[];
}
