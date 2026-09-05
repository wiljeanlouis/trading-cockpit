import { calculateRealizedPnl } from '@trading-cockpit/core/domain/account-equity';
import { summarizeExternalCapital } from '@trading-cockpit/core/domain/capital-transaction';
import {
  createRecordDeposit,
  createRecordInitialFunding,
  createRecordWithdrawal
} from '@trading-cockpit/core/application/trading-account/record-capital-transaction';
import { createCreateTradingAccount } from '@trading-cockpit/core/application/trading-account/create-trading-account';
import { createCreateFundedTradingAccount } from '@trading-cockpit/core/application/trading-account/create-funded-trading-account';
import { createUpdateTradingAccount } from '@trading-cockpit/core/application/trading-account/update-trading-account';
import type {
  AdminOverviewDto,
  CreateFundedTradingAccountRequest,
  RecordCapitalTransactionResponse,
  TradingAccountMutationResponse,
  TradingAccountsDto
} from '@trading-cockpit/contracts';
import {
  readCapitalTransactions,
  readJournalEntries,
  readTradingAccountRecords,
  SHEET_DEFINITIONS,
  validateStrategies as validateStrategiesFromSheets
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import {
  CAPITAL_LEDGER_HEADERS,
  CloudRunTradingAccountManagementRepository,
  NodeRuntime,
  loadMutationRepositories,
  type MutationContext
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  textValue,
  type RequestScopedSheets
} from '../adapters/outbound/google-sheets-api/sheets-api-table';
import { AsyncFinvizTokenService } from '../adapters/outbound/finviz/finviz-token-service';
import { SecretManagerFinvizTokenStorage } from '../adapters/outbound/finviz/secret-manager-finviz-token-storage';
import { ValidationError } from '../http/errors';
import { requiredNumber, requiredText, type MutationDependencies } from './common';

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

export async function validateStrategiesForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<true> {
  return validateStrategiesFromSheets(dependencies.sheets);
}

export async function checkFinvizAuthMutationForCloudRun(): Promise<{ configured: boolean }> {
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  return { configured: await tokenService.isConfigured() };
}

export async function setFinvizTokenForCloudRun({
  body
}: MutationDependencies): Promise<{ configured: true }> {
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  await tokenService.setToken((body as { token?: unknown }).token);
  return { configured: true };
}

export async function deleteFinvizTokenForCloudRun(): Promise<{ configured: false }> {
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  await tokenService.deleteToken();
  return { configured: false };
}

export async function createTradingAccountForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<TradingAccountMutationResponse> {
  const repository = await new CloudRunTradingAccountManagementRepository(mutationContext).load();
  const account = createCreateTradingAccount(repository)({
    accountId: requiredText(body.accountId, 'accountId'),
    name: requiredText(body.name, 'name'),
    baseCurrency: requiredText(body.baseCurrency, 'baseCurrency'),
    riskPercentPerTrade: requiredNumber(body.riskPercentPerTrade, 'riskPercentPerTrade')
  });
  return account;
}

export async function createFundedTradingAccountForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<TradingAccountMutationResponse> {
  const repository = await new CloudRunTradingAccountManagementRepository(mutationContext).load();
  const request = body as unknown as CreateFundedTradingAccountRequest;
  const account = createCreateFundedTradingAccount({
    repository,
    runtime: new NodeRuntime(mutationContext.now)
  })({
    accountId: requiredText(request.accountId, 'accountId'),
    name: requiredText(request.name, 'name'),
    baseCurrency: requiredText(request.baseCurrency, 'baseCurrency'),
    riskPercentPerTrade: requiredNumber(request.riskPercentPerTrade, 'riskPercentPerTrade'),
    initialAmount: requiredNumber(request.initialAmount, 'initialAmount')
  });
  return account;
}

export async function updateTradingAccountForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<TradingAccountMutationResponse> {
  const repository = await new CloudRunTradingAccountManagementRepository(mutationContext).load();
  const account = createUpdateTradingAccount(repository)({
    accountId: requiredText(body.accountId, 'accountId'),
    name: requiredText(body.name, 'name'),
    baseCurrency: requiredText(body.baseCurrency, 'baseCurrency'),
    riskPercentPerTrade: requiredNumber(body.riskPercentPerTrade, 'riskPercentPerTrade')
  });
  return account;
}

export async function recordCapitalTransactionForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<RecordCapitalTransactionResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const recorders = {
    INITIAL_FUNDING: createRecordInitialFunding,
    DEPOSIT: createRecordDeposit,
    WITHDRAWAL: createRecordWithdrawal
  } as const;
  const type = requiredText(body.type, 'type') as keyof typeof recorders;
  const factory = recorders[type];
  if (!factory) throw new ValidationError(`Invalid capital transaction type: ${type}`);
  const transaction = factory({
    tradingAccountRepository: repositories.tradingAccountRepository,
    capitalTransactionRepository: repositories.capitalTransactionRepository,
    runtime: new NodeRuntime(mutationContext.now)
  })({
    accountId: requiredText(body.accountId, 'accountId'),
    amount: requiredNumber(body.amount, 'amount'),
    note: String(body.note ?? '')
  });
  return {
    transactionId: transaction.id,
    accountId: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    occurredAt: transaction.occurredAt.toISOString(),
    note: transaction.note
  };
}

export async function setupMomentumRankingForCloudRun({
  mutationContext
}: MutationDependencies): Promise<{ ok: true }> {
  await ensureSheets(mutationContext, ['Momentum Ranking']);
  mutationContext.writer.update("'Momentum Ranking'!A1:U", [
    [...SHEET_DEFINITIONS.momentumRanking.requiredHeaders]
  ]);
  return { ok: true };
}

export async function setupStrategiesForCloudRun({
  mutationContext
}: MutationDependencies): Promise<{ ok: true }> {
  await ensureSheets(mutationContext, ['Strategies']);
  if (await tableHasData(mutationContext, SHEET_DEFINITIONS.strategies)) {
    mutationContext.writer.update("'Strategies'!A1:H1", [
      [...SHEET_DEFINITIONS.strategies.requiredHeaders]
    ]);
    return { ok: true };
  }
  mutationContext.writer.update("'Strategies'!A1:H2", [
    [...SHEET_DEFINITIONS.strategies.requiredHeaders],
    [
      'MOMENTUM_BREAKOUT',
      'Momentum Breakout',
      'V1',
      'MOMENTUM',
      true,
      0.005,
      5,
      'Momentum breakout near 52-week high'
    ]
  ]);
  return { ok: true };
}

export async function setupTradingAccountsForCloudRun({
  mutationContext
}: MutationDependencies): Promise<{ ok: true }> {
  await ensureSheets(mutationContext, ['Accounts', 'Capital Ledger']);
  mutationContext.writer.update("'Accounts'!A1:D1", [
    [...SHEET_DEFINITIONS.accounts.requiredHeaders]
  ]);
  mutationContext.writer.update("'Capital Ledger'!A1:F1", [[...CAPITAL_LEDGER_HEADERS]]);
  return { ok: true };
}

async function tableHasData(
  context: MutationContext,
  definition: (typeof SHEET_DEFINITIONS)[keyof typeof SHEET_DEFINITIONS]
): Promise<boolean> {
  try {
    const table = (await context.sheets.getTable(definition)).table;
    return [table.headers, ...table.rows].some((row) => row.some((value) => textValue(value)));
  } catch {
    return false;
  }
}

async function ensureSheets(context: MutationContext, sheetNames: string[]): Promise<void> {
  const client = context.writer['dependencies'].sheetsClient;
  const spreadsheetId = context.writer['dependencies'].spreadsheetId;
  if (!client.getSpreadsheet || !client.batchUpdateSpreadsheet) return;
  const spreadsheet = await client.getSpreadsheet({ spreadsheetId });
  const existing = new Set(spreadsheet.sheetTitles);
  const missing = sheetNames.filter((name) => !existing.has(name));
  if (missing.length === 0) return;
  await client.batchUpdateSpreadsheet({
    spreadsheetId,
    requests: missing.map((title) => ({ addSheet: { properties: { title } } }))
  });
}

export function checkFinvizAuthForCloudRun(): never {
  throw new Error(
    'Finviz auth status is not available in Cloud Run until Secret Manager token storage is migrated.'
  );
}
