import {
  summarizeExternalCapital,
  type AccountCapitalSummary
} from '../../domain/capital-transaction';
import type { CapitalTransactionRepository } from '../../ports/outbound/capital-transaction-repository';
import type { TradingAccountRepository } from '../../ports/outbound/trading-account-repository';

export function createGetAccountCapitalSummary(
  accountRepository: TradingAccountRepository,
  transactionRepository: CapitalTransactionRepository
): (accountId: string) => AccountCapitalSummary {
  return (accountId) => {
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    const account = accountRepository.findById(normalizedId);
    if (!account) throw new Error(`Trading Account introuvable : ${normalizedId}`);
    return summarizeExternalCapital(
      account.id,
      account.baseCurrency,
      transactionRepository.findByAccountId(account.id)
    );
  };
}
