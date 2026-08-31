import type { TradingAccount } from '../../domain/trading-account';

export interface TradingAccountRepository {
  findById(accountId: string): TradingAccount | null;
  findAll(): TradingAccount[];
}
