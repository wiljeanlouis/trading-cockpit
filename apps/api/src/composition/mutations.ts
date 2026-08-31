import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import { createRefreshMomentumRanking } from '@trading-cockpit/core/application/momentum/refresh-momentum-ranking';
import { createAddRankedMomentumCandidateToWatchlist } from '@trading-cockpit/core/application/momentum/add-ranked-momentum-candidate-to-watchlist';
import { createAddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';
import { createCreateTradePlanFromWatchlist } from '@trading-cockpit/core/application/trade-plan/create-trade-plan-from-watchlist';
import { createUpdateTradePlanPlanning } from '@trading-cockpit/core/application/trade-plan/update-trade-plan-planning';
import { createGetAccountEquity } from '@trading-cockpit/core/application/trading-account/get-account-equity';
import { createOpenPositionFromTradePlan } from '@trading-cockpit/core/application/position/open-position-from-trade-plan';
import { createClosePosition } from '@trading-cockpit/core/application/position/close-position';
import {
  createRecordDeposit,
  createRecordInitialFunding,
  createRecordWithdrawal
} from '@trading-cockpit/core/application/trading-account/record-capital-transaction';
import { buildSignalKey } from '@trading-cockpit/core/domain/market-signal';
import type {
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  ClosePositionResponse,
  CreateTradePlanResponse,
  ExecuteTradePlanResponse,
  RecordCapitalTransactionResponse,
  UpdateTradePlanPlanningResponse
} from '@trading-cockpit/contracts';
import {
  CloudRunMarketSignalProjection,
  CloudRunMomentumRankingProjection,
  CloudRunMomentumSignalRepository,
  CloudRunSignalHistoryRepository,
  CloudRunTradePlanRepository,
  CloudRunWatchlistRepository,
  LoadedStrategyRepository,
  LoadedTradingStrategyCatalog,
  NodeRuntime,
  CAPITAL_LEDGER_HEADERS,
  loadMutationRepositories,
  type MutationContext
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  LoadedMomentumRankingReader,
  readMomentumRankingRecords,
  readStrategyIds,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import { CloudRunFinvizMarketSignalSource } from '../adapters/outbound/finviz/finviz-market-signal-source';
import { AsyncFinvizTokenService } from '../adapters/outbound/finviz/finviz-token-service';
import { NodeFinvizTransport } from '../adapters/outbound/finviz/node-finviz-transport';
import { SecretManagerFinvizTokenStorage } from '../adapters/outbound/finviz/secret-manager-finviz-token-storage';
import { ValidationError } from '../http/errors';
import { textValue, valueByHeader } from '../adapters/outbound/google-sheets-api/sheets-api-table';

const FINVIZ_BASE_URL = 'https://elite.finviz.com/export/screener';
const MOMENTUM_FEED_ID = 'MOMENTUM_BREAKOUT_V1';
const FINVIZ_FEEDS = [
  {
    id: MOMENTUM_FEED_ID,
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1',
    strategyId: 'MOMENTUM_BREAKOUT',
    query:
      'v=151' +
      '&f=cap_smallover,sh_avgvol_o500,sh_price_o10,sh_relvol_o1,' +
      'ta_highlow52w_b0to5h,ta_perf_4wup,ta_rsi_50to70,' +
      'ta_sma20_pa,ta_sma200_pa,ta_sma50_pa' +
      '&ft=3' +
      '&c=0,1,2,3,4,5,6,7,67,65,66,63,64,59,57,52,54,53,42,43,68'
  }
];

const MOMENTUM_SCORE_CONFIG_HEADERS = ['Component', 'Condition', 'Points', 'Max'] as const;
const MOMENTUM_SCORE_CONFIG_VALUES: (string | number)[][] = [
  ['52W High', '0% à -1%', 25, 25],
  ['52W High', '-1% à -2%', 22, ''],
  ['52W High', '-2% à -3%', 18, ''],
  ['52W High', '-3% à -4%', 14, ''],
  ['52W High', '-4% à -5%', 10, ''],
  ['Relative Volume', '>= 2.0', 25, 25],
  ['Relative Volume', '1.5 à 1.99', 20, ''],
  ['Relative Volume', '1.25 à 1.49', 15, ''],
  ['Relative Volume', '1.0 à 1.24', 10, ''],
  ['Performance Month', '>= 20%', 20, 20],
  ['Performance Month', '15% à 19.99%', 17, ''],
  ['Performance Month', '10% à 14.99%', 14, ''],
  ['Performance Month', '5% à 9.99%', 10, ''],
  ['Performance Month', '0% à 4.99%', 5, ''],
  ['RSI', '60 à 67', 15, 15],
  ['RSI', '55 à 59.99', 12, ''],
  ['RSI', '67.01 à 70', 10, ''],
  ['RSI', '50 à 54.99', 7, ''],
  ['SMA20 Extension', '2% à 8%', 15, 15],
  ['SMA20 Extension', '0% à 2%', 10, ''],
  ['SMA20 Extension', '8% à 12%', 10, ''],
  ['SMA20 Extension', '> 12%', 5, '']
];

export async function refreshFinvizForCloudRun({ mutationContext }: MutationDependencies) {
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  const source = new CloudRunFinvizMarketSignalSource(
    FINVIZ_BASE_URL,
    FINVIZ_FEEDS,
    tokenService,
    new NodeFinvizTransport()
  );
  await source.preload();
  await ensureSheets(mutationContext, ['Signals History', 'Finviz - Momentum']);
  const existingSignalKeys = await readExistingSignalKeys(mutationContext);
  const strategyCatalog = new LoadedTradingStrategyCatalog(
    await readStrategiesForCatalog(mutationContext)
  );
  const archiveSignals = createArchiveMarketSignals({
    repository: new CloudRunSignalHistoryRepository(mutationContext, existingSignalKeys),
    now: mutationContext.now,
    formatSignalDate: (date) => date.toISOString().substring(0, 10)
  });
  const refresh = createRefreshMarketSignals({
    source,
    strategyCatalog,
    projection: new CloudRunMarketSignalProjection(mutationContext),
    archiveSignals,
    now: mutationContext.now
  });
  return { archived: refresh() };
}

export async function refreshMomentumRankingForCloudRun({ mutationContext }: MutationDependencies) {
  const strategies = await readStrategiesForCatalog(mutationContext);
  const signalRepository = await new CloudRunMomentumSignalRepository(mutationContext).load();
  const result = createRefreshMomentumRanking({
    signalRepository,
    strategyRepository: signalRepository,
    rankingProjection: new CloudRunMomentumRankingProjection(mutationContext)
  })();
  void strategies;
  return { signalDate: result.signalDate, ranked: result.ranked.length };
}

export async function addMomentumCandidateToWatchlistForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<AddMomentumCandidateToWatchlistResponse> {
  await mutationContext.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.strategies
  ]);
  const watchlistRepository = await new CloudRunWatchlistRepository(mutationContext).load();
  const addCandidate = createAddCandidateToWatchlist({
    watchlistRepository,
    strategyRepository: new LoadedStrategyRepository(await readStrategyIds(mutationContext.sheets)),
    runtime: new NodeRuntime(mutationContext.now)
  });
  const addRankedCandidate = createAddRankedMomentumCandidateToWatchlist({
    rankingReader: new LoadedMomentumRankingReader(
      await readMomentumRankingRecords(mutationContext.sheets)
    ),
    addCandidateToWatchlist: addCandidate
  });
  return addRankedCandidate(body as unknown as AddMomentumCandidateToWatchlistRequest);
}

export async function createTradePlanForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<CreateTradePlanResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const getAccountEquity = createGetAccountEquity({
    tradingAccountRepository: repositories.tradingAccountRepository,
    capitalTransactionRepository: repositories.capitalTransactionRepository,
    journalRepository: repositories.journalRepository
  });
  const result = createCreateTradePlanFromWatchlist({
    watchlistRepository: repositories.watchlistRepository,
    tradePlanRepository: repositories.tradePlanRepository,
    strategyRepository: repositories.strategyRepository,
    tradingAccountRepository: repositories.tradingAccountRepository,
    tradingAccountRiskPolicyRepository: repositories.tradingAccountRiskPolicyRepository,
    getAccountEquity,
    runtime: new NodeRuntime(mutationContext.now)
  })(body as never);
  const tradePlan = result.kind === 'created' ? result.tradePlan : result.existing;
  return {
    kind: result.kind,
    tradePlanId: tradePlan.id,
    watchlistId: tradePlan.watchlistId,
    ticker: tradePlan.ticker,
    accountId: tradePlan.accountId,
    status: tradePlan.status
  };
}

export async function updateTradePlanPlanningForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<UpdateTradePlanPlanningResponse> {
  const repository = await new CloudRunTradePlanRepository(mutationContext).load();
  const update = createUpdateTradePlanPlanning(repository);
  const tradePlan = update({
    tradePlanId: requiredText(body.tradePlanId, 'tradePlanId'),
    entryPrice: requiredNumber(body.entryPrice, 'entryPrice'),
    stopPrice: requiredNumber(body.stopPrice, 'stopPrice'),
    targetPrice: optionalNumber(body.targetPrice, 'targetPrice'),
    positionSize: optionalNumber(body.positionSize, 'positionSize')
  });
  return { tradePlanId: tradePlan.id, status: tradePlan.status };
}

export async function executeTradePlanForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<ExecuteTradePlanResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const result = createOpenPositionFromTradePlan({
    positionRepository: repositories.positionRepository,
    tradePlanRepository: repositories.tradePlanRepository,
    watchlistRepository: repositories.watchlistRepository,
    strategyRepository: repositories.strategyRepository,
    runtime: new NodeRuntime(mutationContext.now)
  })({ tradePlanId: requiredText(body.tradePlanId, 'tradePlanId') });
  const position = result.kind === 'opened' ? result.position : result.existing;
  return {
    kind: result.kind,
    positionId: position.id,
    tradePlanId: position.tradePlanId,
    accountId: position.accountId,
    ticker: position.ticker,
    openedAt: serializedDate(position.openedAt),
    actualEntry: nullableNumber(position.actualEntry),
    actualQuantity: nullableNumber(position.actualQuantity),
    positionStatus: position.status
  };
}

export async function closePositionForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<ClosePositionResponse> {
  const repositories = await loadMutationRepositories(mutationContext);
  const result = createClosePosition({
    positionRepository: repositories.positionRepository,
    journalRepository: repositories.journalRepository,
    watchlistRepository: repositories.watchlistRepository,
    runtime: new NodeRuntime(mutationContext.now)
  })({
    positionId: requiredText(body.positionId, 'positionId'),
    exitPrice: requiredNumber(body.exitPrice, 'exitPrice')
  });
  return {
    positionId: result.position.id,
    accountId: result.position.accountId,
    ticker: result.position.ticker,
    status: result.position.status,
    closedAt: serializedDate(result.position.closedAt),
    exitPrice: Number(result.position.exitPrice),
    realizedPnl: nullableNumber(result.position.realizedPnl),
    journalCreated: result.journalCreated
  };
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

export async function checkFinvizAuthForCloudRun(): Promise<{ configured: boolean }> {
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

export async function setupMomentumRankingForCloudRun({
  mutationContext
}: MutationDependencies): Promise<{ ok: true }> {
  await ensureSheets(mutationContext, ['Momentum Score Config', 'Momentum Ranking']);
  mutationContext.writer.update("'Momentum Score Config'!A1:D23", [
    [...MOMENTUM_SCORE_CONFIG_HEADERS],
    ...MOMENTUM_SCORE_CONFIG_VALUES
  ]);
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

export async function setupCockpitConfigForCloudRun({
  mutationContext
}: MutationDependencies): Promise<{ ok: true }> {
  await ensureSheets(mutationContext, ['Cockpit Config']);
  if (await sheetRangeHasAnyContent(mutationContext, "'Cockpit Config'!A:C")) return { ok: true };
  mutationContext.writer.update("'Cockpit Config'!A1:C6", [
    ['Parameter', 'Value', 'Description'],
    ['Account Name', 'Trading', 'Nom du compte utilisé pour le trading actif'],
    ['Account Equity', 10000, 'Valeur actuelle du compte utilisée pour le position sizing'],
    ['Default Risk %', 0.005, 'Risque maximal par trade'],
    ['Max Position %', 0.1, 'Exposition maximale recommandée par position'],
    ['Currency', 'CAD', 'Devise du compte']
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

async function sheetRangeHasAnyContent(context: MutationContext, range: string): Promise<boolean> {
  const client = context.writer['dependencies'].sheetsClient;
  const spreadsheetId = context.writer['dependencies'].spreadsheetId;
  const response = await client.getValues({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER'
  });
  return (response.values ?? []).some((row) => row.some((value) => textValue(value)));
}

export interface MutationDependencies {
  mutationContext: MutationContext;
  body: Record<string, unknown>;
  now: () => Date;
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

async function readStrategiesForCatalog(context: MutationContext) {
  const table = await context.sheets.getTable(SHEET_DEFINITIONS.strategies);
  return table.table.rows
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((row) => ({
      id: String(row[0] ?? '')
        .trim()
        .toUpperCase(),
      version: String(row[2] ?? '').trim(),
      enabled: row[4] === true || String(row[4]).toUpperCase() === 'TRUE'
    }));
}

async function readExistingSignalKeys(context: MutationContext): Promise<Set<string>> {
  const keys = new Set<string>();
  const table = (await context.sheets.getTable(SHEET_DEFINITIONS.signalsHistory)).table;
  for (const row of table.rows) {
    const signalDate = normalizeSignalDate(valueByHeader(table.headers, row, 'Signal Date'));
    const strategyId = textValue(valueByHeader(table.headers, row, 'Strategy ID')).toUpperCase();
    const strategyVersion = textValue(valueByHeader(table.headers, row, 'Strategy Version'));
    const ticker = textValue(valueByHeader(table.headers, row, 'Ticker')).toUpperCase();
    if (!signalDate || !strategyId || !ticker) continue;
    keys.add(buildSignalKey(signalDate, strategyId, strategyVersion, ticker));
  }
  return keys;
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  return String(value).trim().substring(0, 10);
}

function requiredText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new ValidationError(`${field} is required.`);
  return text;
}

function requiredNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ValidationError(`${field} must be a finite number.`);
  return number;
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  return requiredNumber(value, field);
}

function serializedDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
