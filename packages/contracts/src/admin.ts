export interface TradingConfigDto {
  accountName: string;
  accountEquity: number;
  defaultRiskPercent: number;
  maxPositionPercent: number;
  currency: string;
}

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
