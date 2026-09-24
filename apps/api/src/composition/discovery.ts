import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import { createGetDiscovery } from '@trading-cockpit/core/application/discovery/get-discovery';
import { buildSignalKey } from '@trading-cockpit/core/domain/market-signal';
import type { TradingStrategy } from '@trading-cockpit/core/domain/trading-strategy';
import type { DiscoveryDto, RunDiscoveryResponse } from '@trading-cockpit/contracts';
import {
  CloudRunMarketSignalProjection,
  CloudRunSignalHistoryRepository,
  LoadedTradingStrategyCatalog,
  type MutationContext
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  LoadedDiscoverySignalReader,
  LoadedWatchlistReader,
  readSignalSnapshots,
  readStrategyRecords,
  readWatchlistEntries,
  SHEET_DEFINITIONS,
  validateStrategies
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import { textValue, valueByHeader } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import { CloudRunFinvizMarketSignalSource } from '../adapters/outbound/finviz/finviz-market-signal-source';
import { NodeFinvizTransport } from '../adapters/outbound/finviz/node-finviz-transport';
import { AsyncFinvizTokenService } from '../adapters/outbound/finviz/finviz-token-service';
import { SecretManagerFinvizTokenStorage } from '../adapters/outbound/finviz/secret-manager-finviz-token-storage';
import type { MutationDependencies } from './common';
import { requiredText } from './common';

export async function getDiscoveryForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<DiscoveryDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.signalsHistory,
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.watchlist
  ]);
  const strategies = await readStrategyRecords(dependencies.sheets);
  return createGetDiscovery({
    signalReader: new LoadedDiscoverySignalReader(
      await readSignalSnapshots(dependencies.sheets),
      strategies
    ),
    watchlistReader: new LoadedWatchlistReader(await readWatchlistEntries(dependencies.sheets)),
    now: dependencies.now
  })();
}

/**
 * Runs Discovery for one selected Strategy and one user-supplied Finviz URL.
 */
export async function runDiscoveryForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<RunDiscoveryResponse> {
  const strategyId = requiredText(body.strategyId, 'strategyId').toUpperCase();
  const finvizUrl = validateFinvizUrl(requiredText(body.finvizUrl, 'finvizUrl'));
  return refreshFinvizFeedForCloudRun({ mutationContext, strategyId, finvizUrl });
}

/**
 * Bridges HTTP mutations to the reusable market-signal use cases.
 *
 * This function batches strategy configuration reads, creates the Finviz adapter, preloads
 * provider data with adapter-level pacing, then delegates projection/archive semantics to Core.
 */
async function refreshFinvizFeedForCloudRun({
  mutationContext,
  strategyId,
  finvizUrl
}: {
  mutationContext: MutationContext;
  strategyId: string;
  finvizUrl: string;
}): Promise<RunDiscoveryResponse> {
  await mutationContext.sheets.batchLoad([SHEET_DEFINITIONS.strategies]);
  await validateStrategies(mutationContext.sheets);
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const feed = buildFinvizFeed({ strategies, strategyId, finvizUrl });
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  const source = new CloudRunFinvizMarketSignalSource(
    '',
    [feed],
    tokenService,
    new NodeFinvizTransport()
  );
  await source.preload();
  await ensureSheets(mutationContext, ['Signals History', 'Finviz Signals']);
  const existingSignalKeys = await readExistingSignalKeys(mutationContext);
  const strategyCatalog = new LoadedTradingStrategyCatalog(strategies);
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
  const result = refresh({ strategyId });
  const refreshed = result.refreshed[0];
  return {
    strategyId,
    archived: result.archived,
    signalCount: refreshed?.signalCount ?? 0
  };
}

/**
 * Converts a user-selected Strategy plus runtime Finviz URL into one concrete provider feed.
 *
 * The URL is intentionally not read from Strategy configuration; Discovery runtime input owns it.
 */
export function buildFinvizFeed({
  strategies,
  strategyId,
  finvizUrl
}: {
  strategies: readonly TradingStrategy[];
  strategyId: string;
  finvizUrl: string;
}) {
  const normalizedStrategyId = textValue(strategyId).toUpperCase();
  const strategy = strategies.find((candidate) => candidate.id === normalizedStrategyId);
  if (!strategy) throw new Error(`Stratégie inconnue : ${normalizedStrategyId}`);
  if (!strategy.enabled) throw new Error(`La stratégie ${normalizedStrategyId} est désactivée.`);
  return {
    id: `DISCOVERY_${normalizedStrategyId}`,
    strategyName: strategy.name,
    strategyId: strategy.id,
    query: finvizUrl
  };
}

/**
 * Creates refresh-owned technical sheets only when an explicit refresh needs them.
 *
 * This is not a general workbook migration path; normal reads should still rely on the
 * canonical workbook contract and fail clearly when required structures are missing.
 */
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

/**
 * Loads existing Signals History identities so archiving remains idempotent.
 *
 * The set is request-local: it avoids duplicate appends for the current refresh without
 * introducing persistent data caching or rewriting unrelated strategy history.
 */
async function readExistingSignalKeys(context: MutationContext): Promise<Set<string>> {
  const keys = new Set<string>();
  const table = (await context.sheets.getTable(SHEET_DEFINITIONS.signalsHistory)).table;
  for (const row of table.rows) {
    const signalDate = normalizeSignalDate(valueByHeader(table.headers, row, 'Signal Date'));
    const strategyId = textValue(valueByHeader(table.headers, row, 'Strategy ID')).toUpperCase();
    const ticker = textValue(valueByHeader(table.headers, row, 'Ticker')).toUpperCase();
    if (!signalDate || !strategyId || !ticker) continue;
    keys.add(buildSignalKey(signalDate, strategyId, ticker));
  }
  return keys;
}

function validateFinvizUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Finviz URL invalide.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Finviz URL doit utiliser HTTPS.');
  if (parsed.username || parsed.password) {
    throw new Error('Finviz URL ne doit pas contenir d’identifiants.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'finviz.com' && host !== 'www.finviz.com' && host !== 'elite.finviz.com') {
    throw new Error('Finviz URL doit cibler un domaine Finviz supporté.');
  }
  return parsed.toString();
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  return String(value).trim().substring(0, 10);
}
