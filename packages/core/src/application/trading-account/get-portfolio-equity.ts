import type { AccountEquitySummary } from '../../domain/account-equity';
import { createAccountEquitySummary } from '../../domain/account-equity';
import {
  summarizeExternalCapital,
  type CapitalTransaction
} from '../../domain/capital-transaction';
import type { JournalEntry } from '../../domain/journal-entry';
import type { PortfolioScope, TradingAccount } from '../../domain/trading-account';

export interface PortfolioEquitySummary {
  scope: PortfolioScope;
  accountId: string | null;
  accountName: string;
  accountCount: number;
  baseCurrency: string;
  netExternalCapital: number;
  realizedPnl: number;
  realizedEquity: number;
  basis: AccountEquitySummary['basis'];
  accounts: AccountEquitySummary[];
}

export function calculatePortfolioEquitySummary({
  accounts,
  transactions,
  journalEntries,
  scope
}: {
  accounts: readonly TradingAccount[];
  transactions: readonly CapitalTransaction[];
  journalEntries: readonly JournalEntry[];
  scope: PortfolioScope;
}): PortfolioEquitySummary {
  const scopedAccounts = accountsForScope(accounts, scope);
  const summaries = scopedAccounts.map((account) =>
    createAccountEquitySummary(
      summarizeExternalCapital(
        account.id,
        account.baseCurrency,
        transactions.filter((transaction) => transaction.accountId === account.id)
      ),
      journalEntries.filter((entry) => entry.accountId === account.id)
    )
  );

  const baseCurrency = sharedBaseCurrency(summaries);
  return {
    scope,
    accountId: scope.type === 'ACCOUNT' ? scope.accountId : null,
    accountName: scope.type === 'ACCOUNT' ? scopedAccounts[0].name : 'All Accounts',
    accountCount: scopedAccounts.length,
    baseCurrency,
    netExternalCapital: sum(summaries.map((summary) => summary.netExternalCapital)),
    realizedPnl: sum(summaries.map((summary) => summary.realizedPnl)),
    realizedEquity: sum(summaries.map((summary) => summary.realizedEquity)),
    basis: 'REALIZED',
    accounts: summaries
  };
}

function accountsForScope(accounts: readonly TradingAccount[], scope: PortfolioScope) {
  if (scope.type === 'ALL') return [...accounts];
  const accountId = String(scope.accountId || '')
    .trim()
    .toUpperCase();
  if (!accountId) throw new Error('Account ID absent.');
  const account = accounts.find((candidate) => candidate.id === accountId);
  if (!account) throw new Error(`Trading Account introuvable : ${accountId}`);
  return [account];
}

function sharedBaseCurrency(summaries: readonly AccountEquitySummary[]): string {
  const currencies = new Set(summaries.map((summary) => summary.baseCurrency).filter(Boolean));
  if (currencies.size === 0)
    throw new Error('Aucun compte disponible pour calculer le portefeuille.');
  if (currencies.size > 1) {
    throw new Error('Agrégation monétaire impossible : plusieurs devises de base.');
  }
  return [...currencies][0];
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
