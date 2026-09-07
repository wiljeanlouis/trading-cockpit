import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';
import { createRefreshMomentumRanking } from '@trading-cockpit/core/application/momentum/refresh-momentum-ranking';
import { createGetMomentumRanking } from '@trading-cockpit/core/application/momentum/get-momentum-ranking';
import { buildSignalKey } from '@trading-cockpit/core/domain/market-signal';
import type { MomentumRankingDto } from '@trading-cockpit/contracts';
import {
  CloudRunMarketSignalProjection,
  CloudRunMomentumRankingProjection,
  CloudRunMomentumSignalRepository,
  CloudRunSignalHistoryRepository,
  LoadedTradingStrategyCatalog,
  type MutationContext
} from '../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  LoadedMomentumRankingReader,
  LoadedWatchlistReader,
  readMomentumRankingRecords,
  readStrategyRecords,
  readStrategyVersionRecords,
  readWatchlistEntries,
  SHEET_DEFINITIONS,
  validateStrategies
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import { CloudRunFinvizMarketSignalSource } from '../adapters/outbound/finviz/finviz-market-signal-source';
import { NodeFinvizTransport } from '../adapters/outbound/finviz/node-finviz-transport';
import { AsyncFinvizTokenService } from '../adapters/outbound/finviz/finviz-token-service';
import { SecretManagerFinvizTokenStorage } from '../adapters/outbound/finviz/secret-manager-finviz-token-storage';
import type { MutationDependencies } from './common';

export async function getMomentumRankingForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<MomentumRankingDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist
  ]);
  return createGetMomentumRanking({
    reader: new LoadedMomentumRankingReader(await readMomentumRankingRecords(dependencies.sheets)),
    watchlistReader: new LoadedWatchlistReader(await readWatchlistEntries(dependencies.sheets)),
    now: dependencies.now
  })();
}

export async function refreshFinvizForCloudRun({ mutationContext }: MutationDependencies) {
  await mutationContext.sheets.batchLoad([
    SHEET_DEFINITIONS.strategies,
    SHEET_DEFINITIONS.strategyVersions
  ]);
  await validateStrategies(mutationContext.sheets);
  const strategies = await readStrategyRecords(mutationContext.sheets);
  const versions = await readStrategyVersionRecords(mutationContext.sheets);
  const feeds = versions
    .filter((version) => version.enabled && version.screener === 'FINVIZ')
    .map((version) => {
      const strategy = strategies.find((candidate) => candidate.id === version.strategyId);
      if (!strategy) throw new Error(`Stratégie inconnue : ${version.strategyId}`);
      return {
        id: version.screenerCode,
        strategyName: strategy.name,
        strategyVersion: version.version,
        strategyId: version.strategyId,
        query: version.screenerUrl
      };
    });
  const tokenService = new AsyncFinvizTokenService(new SecretManagerFinvizTokenStorage());
  const source = new CloudRunFinvizMarketSignalSource(
    '',
    feeds,
    tokenService,
    new NodeFinvizTransport()
  );
  await source.preload();
  await ensureSheets(mutationContext, ['Signals History', 'Finviz - Momentum']);
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
  return { archived: refresh() };
}

export async function refreshMomentumRankingForCloudRun({ mutationContext }: MutationDependencies) {
  const signalRepository = await new CloudRunMomentumSignalRepository(mutationContext).load();
  const result = createRefreshMomentumRanking({
    signalRepository,
    strategyRepository: signalRepository,
    rankingProjection: new CloudRunMomentumRankingProjection(mutationContext)
  })();
  return { signalDate: result.signalDate, ranked: result.ranked.length };
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

async function readExistingSignalKeys(context: MutationContext): Promise<Set<string>> {
  const keys = new Set<string>();
  const table = (await context.sheets.getTable(SHEET_DEFINITIONS.signalsHistory)).table;
  for (const row of table.rows) {
    const signalDate = normalizeSignalDate(row[0]);
    const strategyId = String(row[1] ?? '')
      .trim()
      .toUpperCase();
    const strategyVersion = String(row[2] ?? '').trim();
    const ticker = String(row[3] ?? '')
      .trim()
      .toUpperCase();
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
