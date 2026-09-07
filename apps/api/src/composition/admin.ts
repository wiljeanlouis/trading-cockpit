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
  CreateStrategyRequest,
  CreateStrategyVersionRequest,
  RecordCapitalTransactionResponse,
  StrategyDto,
  TradingAccountMutationResponse,
  TradingAccountsDto,
  UpdateStrategyRequest,
  UpdateStrategyVersionRequest
} from '@trading-cockpit/contracts';
import {
  readCapitalTransactions,
  readJournalEntries,
  readStrategyRecords,
  readStrategyVersionRecords,
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
  normalizeTradingStrategy,
  normalizeTradingStrategyVersion,
  type TradingStrategy,
  type TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';
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
    SHEET_DEFINITIONS.journal,
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.strategyVersions
  ]);
  const [accounts, transactions, journalEntries, strategies, versions, finviz] = await Promise.all([
    readTradingAccountRecords(dependencies.sheets),
    readCapitalTransactions(dependencies.sheets),
    readJournalEntries(dependencies.sheets),
    readStrategyRecords(dependencies.sheets),
    readStrategyVersionRecords(dependencies.sheets),
    checkFinvizAuthMutationForCloudRun()
  ]);

  return {
    finviz,
    strategies: strategiesToDto(strategies, versions),
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

function strategiesToDto(
  strategies: readonly TradingStrategy[],
  versions: readonly TradingStrategyVersion[]
): StrategyDto[] {
  return strategies.map((strategy) => ({
    strategyId: strategy.id,
    name: strategy.name,
    type: strategy.type,
    enabled: strategy.enabled,
    description: strategy.description,
    versions: versions
      .filter((version) => version.strategyId === strategy.id)
      .map((version) => ({
        strategyId: version.strategyId,
        version: version.version,
        enabled: version.enabled,
        screenerCode: version.screenerCode,
        screener: version.screener as StrategyDto['versions'][number]['screener'],
        finvizUrl: version.screenerUrl
      }))
  }));
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

export async function createStrategyForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<StrategyDto> {
  const request = body as unknown as CreateStrategyRequest;
  await ensureSheets(mutationContext, ['Strategies', 'Strategy Versions']);
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const strategy = normalizeTradingStrategy({
    id: requiredText(request.strategyId, 'strategyId'),
    name: requiredText(request.name, 'name'),
    type: requiredText(request.type, 'type'),
    enabled: booleanValue(request.enabled),
    description: String(request.description ?? '')
  });
  if (strategies.some((candidate) => candidate.id === strategy.id)) {
    throw new ValidationError(`Strategy ID dupliqué : ${strategy.id}`);
  }
  mutationContext.writer.append(SHEET_DEFINITIONS.strategies.range, [strategyToRow(strategy)]);
  return strategiesToDto([...strategies, strategy], versions).find(
    (candidate) => candidate.strategyId === strategy.id
  ) as StrategyDto;
}

export async function updateStrategyForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<StrategyDto> {
  const request = body as unknown as UpdateStrategyRequest;
  const strategyId = requiredText(request.strategyId, 'strategyId').toUpperCase();
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const index = strategies.findIndex((candidate) => candidate.id === strategyId);
  if (index < 0) throw new ValidationError(`Stratégie inconnue : ${strategyId}`);
  const strategy = normalizeTradingStrategy({
    id: strategyId,
    name: requiredText(request.name, 'name'),
    type: requiredText(request.type, 'type'),
    enabled: booleanValue(request.enabled),
    description: String(request.description ?? '')
  });
  if (
    !strategy.enabled &&
    versions.some((version) => version.strategyId === strategy.id && version.enabled)
  ) {
    throw new ValidationError(`Désactive d’abord les versions actives de ${strategy.id}.`);
  }
  mutationContext.writer.update(`'Strategies'!A${index + 2}:E${index + 2}`, [
    strategyToRow(strategy)
  ]);
  return strategiesToDto(
    strategies.map((candidate) => (candidate.id === strategy.id ? strategy : candidate)),
    versions
  ).find((candidate) => candidate.strategyId === strategy.id) as StrategyDto;
}

export async function createStrategyVersionForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<StrategyDto> {
  const request = body as unknown as CreateStrategyVersionRequest;
  await ensureSheets(mutationContext, ['Strategies', 'Strategy Versions']);
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const version = normalizeTradingStrategyVersion({
    strategyId: requiredText(request.strategyId, 'strategyId'),
    version: requiredText(request.version, 'version'),
    enabled: booleanValue(request.enabled),
    screenerCode: requiredText(request.screenerCode, 'screenerCode'),
    screener: requiredText(request.screener, 'screener'),
    screenerUrl: requiredText(request.finvizUrl, 'finvizUrl')
  });
  validateVersionCanBeSaved(strategies, versions, version, 'create');
  mutationContext.writer.append(SHEET_DEFINITIONS.strategyVersions.range, [
    strategyVersionToRow(version)
  ]);
  return strategyDtoOrThrow(strategies, [...versions, version], version.strategyId);
}

export async function updateStrategyVersionForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<StrategyDto> {
  const request = body as unknown as UpdateStrategyVersionRequest;
  const strategyId = requiredText(request.strategyId, 'strategyId').toUpperCase();
  const versionId = requiredText(request.version, 'version');
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const index = versions.findIndex(
    (candidate) => candidate.strategyId === strategyId && candidate.version === versionId
  );
  if (index < 0)
    throw new ValidationError(`Strategy Version inconnue : ${strategyId}|${versionId}`);
  const existing = versions[index];
  const version = normalizeTradingStrategyVersion({
    ...existing,
    enabled: booleanValue(request.enabled)
  });
  const remaining = versions.filter((_candidate, candidateIndex) => candidateIndex !== index);
  validateVersionCanBeSaved(strategies, remaining, version, 'update');
  mutationContext.writer.update(`'Strategy Versions'!A${index + 2}:F${index + 2}`, [
    strategyVersionToRow(version)
  ]);
  return strategyDtoOrThrow(
    strategies,
    versions.map((candidate, candidateIndex) => (candidateIndex === index ? version : candidate)),
    strategyId
  );
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
  await ensureSheets(mutationContext, ['Strategies', 'Strategy Versions']);
  if (await tableHasData(mutationContext, SHEET_DEFINITIONS.strategies)) {
    mutationContext.writer.update("'Strategies'!A1:E1", [
      [...SHEET_DEFINITIONS.strategies.requiredHeaders]
    ]);
  } else {
    mutationContext.writer.update("'Strategies'!A1:E1", [
      [...SHEET_DEFINITIONS.strategies.requiredHeaders]
    ]);
  }
  if (await tableHasData(mutationContext, SHEET_DEFINITIONS.strategyVersions)) {
    mutationContext.writer.update("'Strategy Versions'!A1:F1", [
      [...SHEET_DEFINITIONS.strategyVersions.requiredHeaders]
    ]);
  } else {
    mutationContext.writer.update("'Strategy Versions'!A1:F1", [
      [...SHEET_DEFINITIONS.strategyVersions.requiredHeaders]
    ]);
  }
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

function booleanValue(value: unknown): boolean {
  return value === true || String(value).trim().toUpperCase() === 'TRUE';
}

function strategyToRow(strategy: TradingStrategy): unknown[] {
  return [strategy.id, strategy.name, strategy.type, strategy.enabled, strategy.description];
}

function strategyVersionToRow(version: TradingStrategyVersion): unknown[] {
  return [
    version.strategyId,
    version.version,
    version.enabled,
    version.screenerCode,
    version.screener,
    version.screenerUrl
  ];
}

function strategyDtoOrThrow(
  strategies: readonly TradingStrategy[],
  versions: readonly TradingStrategyVersion[],
  strategyId: string
): StrategyDto {
  const strategy = strategiesToDto(strategies, versions).find(
    (candidate) => candidate.strategyId === strategyId
  );
  if (!strategy) throw new ValidationError(`Stratégie inconnue : ${strategyId}`);
  return strategy;
}

function validateVersionCanBeSaved(
  strategies: readonly TradingStrategy[],
  existingVersions: readonly TradingStrategyVersion[],
  version: TradingStrategyVersion,
  mode: 'create' | 'update'
): void {
  const parent = strategies.find((strategy) => strategy.id === version.strategyId);
  if (!parent) throw new ValidationError(`Stratégie inconnue : ${version.strategyId}`);
  if (
    mode === 'create' &&
    existingVersions.some(
      (candidate) =>
        candidate.strategyId === version.strategyId && candidate.version === version.version
    )
  ) {
    throw new ValidationError(
      `Strategy Version dupliquée : ${version.strategyId}|${version.version}`
    );
  }
  if (version.enabled && !parent.enabled) {
    throw new ValidationError(`Strategy parent désactivée : ${version.strategyId}`);
  }
  if (
    version.enabled &&
    existingVersions.some(
      (candidate) => candidate.strategyId === version.strategyId && candidate.enabled
    )
  ) {
    throw new ValidationError(`Plusieurs versions actives pour ${version.strategyId}`);
  }
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
