import type { TradingAccount } from '../../domain/trading-account';
import type { TradingAccountRepository } from '../../ports/outbound/trading-account-repository';

export function createListTradingAccounts(
  repository: TradingAccountRepository
): () => TradingAccount[] {
  return () => repository.findAll();
}
