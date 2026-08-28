import type { TradingAccount } from '../../core/domain/trading-account';

export interface TradingAccountRepository {
  findById(accountId: string): TradingAccount | null;
  findAll(): TradingAccount[];
}
