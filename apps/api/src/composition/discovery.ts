import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import { createGetDiscovery } from '@trading-cockpit/core/application/discovery/get-discovery';
import { buildSignalKey } from '@trading-cockpit/core/domain/market-signal';
import type {
  TradingStrategy,
  TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';
import type { DiscoveryDto, RefreshSignalsResponse } from '@trading-cockpit/contracts';
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
  readStrategyVersionRecords,
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
    SHEET_DEFINITIONS.strategyVersions,
    SHEET_DEFINITIONS.watchlist
  ]);
  return createGetDiscovery({
    signalReader: new LoadedDiscoverySignalReader(
      await readSignalSnapshots(dependencies.sheets),
      await readStrategyRecords(dependencies.sheets),
      await readStrategyVersionRecords(dependencies.sheets)
    ),
    watchlistReader: new LoadedWatchlistReader(await readWatchlistEntries(dependencies.sheets)),
    now: dependencies.now
  })();
}

/**
 * Refreshes signals for one selected Strategy ID.
 *
 * The caller does not provide a version: Cloud Run resolves the currently active Strategy
 * Version from canonical workbook configuration before any provider request is made.
 */
export async function refreshSignalsForCloudRun({
  mutationContext,
  body
}: MutationDependencies): Promise<RefreshSignalsResponse> {
  const strategyId = requiredText(body.strategyId, 'strategyId').toUpperCase();
  return refreshFinvizFeedsForCloudRun({ mutationContext, strategyId });
}

/**
 * Explicitly refreshes every active Finviz-backed strategy version.
 *
 * Discovery reads are intentionally separate from provider refreshes so navigation/filtering
 * cannot accidentally consume Finviz request quota.
 */
export async function refreshAllSignalsForCloudRun({
  mutationContext
}: MutationDependencies): Promise<RefreshSignalsResponse> {
  return refreshFinvizFeedsForCloudRun({ mutationContext });
}

/**
 * Bridges HTTP mutations to the reusable market-signal use cases.
 *
 * This function batches strategy configuration reads, creates the Finviz adapter, preloads
 * provider data with adapter-level pacing, then delegates projection/archive semantics to Core.
 */
async function refreshFinvizFeedsForCloudRun({
  mutationContext,
  strategyId
}: {
  mutationContext: MutationContext;
  strategyId?: string;
}): Promise<RefreshSignalsResponse> {
  await mutationContext.sheets.batchLoad([
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.strategyVersions
  ]);
  await validateStrategies(mutationContext.sheets);
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const feeds = buildFinvizFeeds({ strategies, versions, strategyId });
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  const source = new CloudRunFinvizMarketSignalSource(
    '',
    feeds,
    tokenService,
    new NodeFinvizTransport()
  );
  await source.preload();
  await ensureSheets(mutationContext, ['Signals History', 'Finviz Signals']);
  const existingSignalKeys = await readExistingSignalKeys(mutationContext);
  const strategyCatalog = new LoadedTradingStrategyCatalog(strategies, versions);
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
  const result = refresh(strategyId ? { strategyId } : undefined);
  return {
    scope: strategyId ? 'STRATEGY' : 'ALL',
    archived: result.archived,
    refreshed: result.refreshed
  };
}

/**
 * Converts enabled Strategy Version rows into concrete Finviz feed configurations.
 *
 * Scoped refreshes fail fast when the requested strategy is missing, disabled or lacks an
 * active Finviz version; they never silently fall back to another strategy.
 */
export function buildFinvizFeeds({
  strategies,
  versions,
  strategyId
}: {
  strategies: readonly TradingStrategy[];
  versions: readonly TradingStrategyVersion[];
  strategyId?: string;
}) {
  const normalizedStrategyId = strategyId ? textValue(strategyId).toUpperCase() : null;
  if (normalizedStrategyId) {
    const strategy = strategies.find((candidate) => candidate.id === normalizedStrategyId);
    if (!strategy) throw new Error(`Stratégie inconnue : ${normalizedStrategyId}`);
    if (!strategy.enabled) throw new Error(`La stratégie ${normalizedStrategyId} est désactivée.`);
    const activeVersions = versions.filter(
      (version) => version.strategyId === normalizedStrategyId && version.enabled
    );
    if (activeVersions.length === 0) {
      throw new Error(`Aucune version active pour ${normalizedStrategyId}.`);
    }
  }

  const feeds = versions
    .filter((version) => version.enabled && version.screener === 'FINVIZ')
    .filter((version) => !normalizedStrategyId || version.strategyId === normalizedStrategyId)
    .map((version) => {
      const strategy = strategies.find((candidate) => candidate.id === version.strategyId);
      if (!strategy) throw new Error(`Stratégie inconnue : ${version.strategyId}`);
      if (!strategy.enabled) return null;
      return {
        id: version.screenerCode,
        strategyName: strategy.name,
        strategyVersion: version.version,
        strategyId: version.strategyId,
        query: version.screenerUrl
      };
    })
    .filter((feed): feed is NonNullable<typeof feed> => Boolean(feed));

  if (normalizedStrategyId && feeds.length === 0) {
    throw new Error(`Aucun feed Finviz actif configuré pour ${normalizedStrategyId}.`);
  }
  if (!normalizedStrategyId && feeds.length === 0) {
    throw new Error('Aucune stratégie Finviz active configurée.');
  }
  return feeds;
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
