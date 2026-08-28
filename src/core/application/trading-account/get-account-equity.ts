import { createAccountEquitySummary, type AccountEquitySummary } from '../../domain/account-equity';
import { summarizeExternalCapital } from '../../domain/capital-transaction';
import type { CapitalTransactionRepository } from '../../../ports/outbound/capital-transaction-repository';
import type { JournalRepository } from '../../../ports/outbound/journal-repository';
import type { TradingAccountRepository } from '../../../ports/outbound/trading-account-repository';

export interface GetAccountEquityDependencies {
  tradingAccountRepository: TradingAccountRepository;
  capitalTransactionRepository: CapitalTransactionRepository;
  journalRepository: JournalRepository;
  observe?: (event: string, fields: Record<string, unknown>) => void;
}

export type GetAccountEquity = (accountId: string) => AccountEquitySummary;

export function createGetAccountEquity({
  tradingAccountRepository,
  capitalTransactionRepository,
  journalRepository,
  observe
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
    const equity = createAccountEquitySummary(
      capital,
      journalRepository.findClosedByAccountId(normalizedAccountId)
    );
    observe?.('ACCOUNT_EQUITY_CALCULATED', {
      accountId: normalizedAccountId,
      initialFunding: capital.initialFunding,
      deposits: capital.totalDeposits,
      withdrawals: capital.totalWithdrawals,
      netExternalCapital: equity.netExternalCapital,
      realizedPnl: equity.realizedPnl,
      realizedEquity: equity.realizedEquity,
      basis: equity.basis
    });
    return equity;
  };
}
