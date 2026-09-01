import { calculateRealizedPnl } from '@trading-cockpit/core/domain/account-equity';
import { summarizeExternalCapital } from '@trading-cockpit/core/domain/capital-transaction';
import type {
  AdminOverviewDto,
  TradingAccountsDto,
  TradingConfigDto
} from '@trading-cockpit/contracts';
import {
  readCapitalTransactions,
  readJournalEntries,
  readTradingAccountRecords,
  readTradingConfig,
  SHEET_DEFINITIONS,
  validateStrategies as validateStrategiesFromSheets
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import { checkFinvizAuthForCloudRun as checkFinvizAuthMutationForCloudRun } from './mutations';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getTradingAccountsForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<TradingAccountsDto> {
  const accounts = await readTradingAccountRecords(dependencies.sheets);
  return {
    accounts
  };
}

export async function getAdminOverviewForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<AdminOverviewDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.accounts,
    SHEET_DEFINITIONS.capitalLedger,
    SHEET_DEFINITIONS.journal
  ]);
  const [accounts, transactions, journalEntries, finviz] = await Promise.all([
    readTradingAccountRecords(dependencies.sheets),
    readCapitalTransactions(dependencies.sheets),
    readJournalEntries(dependencies.sheets),
    checkFinvizAuthMutationForCloudRun()
  ]);

  return {
    finviz,
    accounts: accounts.map((account) => {
      const accountTransactions = transactions
        .filter((transaction) => transaction.accountId === account.id)
        .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
      const accountJournalEntries = journalEntries.filter(
        (entry) => entry.accountId === account.id
      );
      const capital = summarizeExternalCapital(
        account.id,
        account.baseCurrency,
        accountTransactions
      );
      const realizedPnl = calculateRealizedPnl(accountJournalEntries);
      return {
        ...account,
        financialSummary: {
          initialFunding: capital.initialFunding,
          deposits: capital.totalDeposits,
          withdrawals: capital.totalWithdrawals,
          netExternalCapital: capital.netExternalCapital,
          realizedPnl,
          realizedEquity: capital.netExternalCapital + realizedPnl
        },
        capitalTransactions: accountTransactions.map((transaction) => ({
          transactionId: transaction.id,
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
          occurredAt: transaction.occurredAt.toISOString(),
          note: transaction.note
        }))
      };
    })
  };
}

export async function getTradingConfigForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<TradingConfigDto> {
  return readTradingConfig(dependencies.sheets);
}

export async function validateStrategiesForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<true> {
  return validateStrategiesFromSheets(dependencies.sheets);
}

export function checkFinvizAuthForCloudRun(): never {
  throw new Error(
    'Finviz auth status is not available in Cloud Run until Secret Manager token storage is migrated.'
  );
}
