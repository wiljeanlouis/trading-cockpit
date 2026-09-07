export type CapitalTransactionType = 'INITIAL_FUNDING' | 'DEPOSIT' | 'WITHDRAWAL';

export interface RecordCapitalTransactionRequest {
  accountId: string;
  amount: number;
  note: string | null;
  type: CapitalTransactionType;
}

export interface RecordCapitalTransactionResponse {
  transactionId: string;
  accountId: string;
  type: CapitalTransactionType;
  amount: number;
  occurredAt: string;
  note: string;
}

export interface CreateTradingAccountRequest {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
}

export interface CreateFundedTradingAccountRequest extends CreateTradingAccountRequest {
  initialAmount: number;
}

export interface UpdateTradingAccountRequest {
  accountId: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
}

export interface TradingAccountMutationResponse {
  id: string;
  name: string;
  baseCurrency: string;
  riskPercentPerTrade: number;
}

export interface AccountFinancialSummaryDto {
  initialFunding: number;
  deposits: number;
  withdrawals: number;
  netExternalCapital: number;
  realizedPnl: number;
  realizedEquity: number;
}

export interface CapitalTransactionDto {
  transactionId: string;
  accountId: string;
  type: CapitalTransactionType;
  amount: number;
  occurredAt: string;
  note: string;
}

export interface AdminAccountDto extends TradingAccountMutationResponse {
  financialSummary: AccountFinancialSummaryDto;
  capitalTransactions: CapitalTransactionDto[];
}

export type StrategyScreenerProvider = 'FINVIZ';

export const STRATEGY_HEADERS = ['Strategy ID', 'Name', 'Type', 'Enabled', 'Description'] as const;

export const STRATEGY_VERSION_HEADERS = [
  'Strategy ID',
  'Version',
  'Enabled',
  'Screener Code',
  'Screener',
  'Finviz URL'
] as const;

export interface StrategyVersionDto {
  strategyId: string;
  version: string;
  enabled: boolean;
  screenerCode: string;
  screener: StrategyScreenerProvider;
  finvizUrl: string;
}

export interface StrategyDto {
  strategyId: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
  versions: StrategyVersionDto[];
}

export interface CreateStrategyRequest {
  strategyId: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export interface UpdateStrategyRequest {
  strategyId: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export interface CreateStrategyVersionRequest {
  strategyId: string;
  version: string;
  enabled: boolean;
  screenerCode: string;
  screener: StrategyScreenerProvider;
  finvizUrl: string;
}

export interface UpdateStrategyVersionRequest {
  strategyId: string;
  version: string;
  enabled: boolean;
}

export interface AdminOverviewDto {
  finviz: {
    configured: boolean;
  };
  accounts: AdminAccountDto[];
  strategies: StrategyDto[];
}
