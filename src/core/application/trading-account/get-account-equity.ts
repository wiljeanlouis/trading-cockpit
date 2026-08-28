import { createAccountEquitySummary, type AccountEquitySummary } from '../../domain/account-equity';
import { summarizeExternalCapital } from '../../domain/capital-transaction';
import type { CapitalTransactionRepository } from '../../../ports/outbound/capital-transaction-repository';
import type { JournalRepository } from '../../../ports/outbound/journal-repository';
import type { TradingAccountRepository } from '../../../ports/outbound/trading-account-repository';

export interface GetAccountEquityDependencies {
  tradingAccountRepository: TradingAccountRepository;
  capitalTransactionRepository: CapitalTransactionRepository;
  journalRepository: JournalRepository;
}

export type GetAccountEquity = (accountId: string) => AccountEquitySummary;

export function createGetAccountEquity({
  tradingAccountRepository,
  capitalTransactionRepository,
  journalRepository
}: GetAccountEquityDependencies): GetAccountEquity {
  return (accountId) => {
    const normalizedAccountId = String(accountId || '')
      .trim()
      .toUpperCase();
    if (!normalizedAccountId) throw new Error('Account ID absent.');
    const account = tradingAccountRepository.findById(normalizedAccountId);
    if (!account) throw new Error(`Trading Account introuvable : ${normalizedAccountId}`);
    const transactions = capitalTransactionRepository.findByAccountId(normalizedAccountId);
    if (!transactions.some((transaction) => transaction.type === 'INITIAL_FUNDING')) {
      throw new Error(`Initial Funding absent pour le compte ${normalizedAccountId}.`);
    }
    const capital = summarizeExternalCapital(
      normalizedAccountId,
      account.baseCurrency,
      transactions
    );
    return createAccountEquitySummary(
      capital,
      journalRepository.findClosedByAccountId(normalizedAccountId)
    );
  };
}
