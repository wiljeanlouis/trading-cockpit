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

export interface AdminOverviewDto {
  finviz: {
    configured: boolean;
  };
  accounts: AdminAccountDto[];
}
