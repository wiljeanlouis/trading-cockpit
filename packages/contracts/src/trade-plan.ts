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
