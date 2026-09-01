import type { CapitalTransaction } from '../../domain/capital-transaction';
import type { TradingAccountRecord } from '../../domain/trading-account';

export interface TradingAccountReferenceSummary {
  tradePlans: number;
  positions: number;
  journalEntries: number;
  capitalTransactions: number;
}

export interface TradingAccountManagementRepository {
  findById(accountId: string): TradingAccountRecord | null;
  create(account: TradingAccountRecord): void;
  createFunded(account: TradingAccountRecord, initialFunding: CapitalTransaction): void;
  update(account: TradingAccountRecord): void;
  countReferences(accountId: string): TradingAccountReferenceSummary;
}
