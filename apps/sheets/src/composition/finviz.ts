import {
  checkFinvizAuthFromSheets,
  configureFinvizTokenFromSheets,
  deleteFinvizTokenFromSheets
} from '../adapters/inbound/google-sheets/ui/manage-finviz-token';
import { refreshFinvizFromSheets } from '../adapters/inbound/google-sheets/ui/refresh-finviz';
import { AppsScriptRuntime } from '../adapters/outbound/apps-script/apps-script-runtime';
import { RuntimeLogger } from '../adapters/outbound/apps-script/runtime-logger';
import { formatAppsScriptSignalDate } from '../adapters/outbound/apps-script/apps-script-signal-date-formatter';
import { AppsScriptFinvizTokenStorage } from '../adapters/outbound/finviz/apps-script-finviz-token-storage';
import { AppsScriptFinvizTransport } from '../adapters/outbound/finviz/apps-script-finviz-transport';
import {
  FinvizMarketSignalSource,
  type FinvizFeedConfiguration
} from '../adapters/outbound/finviz/finviz-market-signal-source';
import { FinvizTokenService } from '../adapters/outbound/finviz/finviz-token-service';
import { GoogleSheetsFinvizSignalProjection } from '../adapters/outbound/finviz/google-sheets-finviz-signal-projection';
import { GoogleSheetsSignalHistoryRepository } from '../adapters/outbound/google-sheets/signal-history/google-sheets-signal-history-repository';
import { GoogleSheetsTradingStrategyCatalog } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-catalog';
import { GoogleSheetsTradingStrategyReader } from '../adapters/outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-reader';
import { createArchiveMarketSignals } from '@trading-cockpit/core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/core/application/market-signals/refresh-market-signals';

function tokenService(): FinvizTokenService {
  return new FinvizTokenService(new AppsScriptFinvizTokenStorage());
}

function finvizFeeds(): FinvizFeedConfiguration[] {
  const reader = new GoogleSheetsTradingStrategyReader();
  const strategies = reader.listEnabled();
  const feeds = reader
    .listVersions()
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
  if (feeds.length === 0) {
    throw new Error('Aucune stratégie Finviz active configurée.');
  }
  return feeds;
}

export function runRefreshFinviz(): number {
  const logger = new RuntimeLogger('refresh-market-signals');
  logger.start();
  const runtime = new AppsScriptRuntime();
  const diagnostics = {
    info: (event: string, fields: Record<string, unknown>) => logger.info(event, fields),
    error: (stage: string, error: unknown) => logger.error(stage, error)
  };
  const observe = (event: string, fields: Record<string, unknown>) => {
    if (event === 'TECHNICAL_FAILURE') {
      logger.error(
        String(fields.stage),
        new Error(String(fields.errorMessage || 'Runtime failure')),
        fields
      );
    } else if (event === 'VALID_EMPTY_RESULT') logger.warn(event, fields);
    else logger.info(event, fields);
  };
  const feeds = finvizFeeds();
  const source = new FinvizMarketSignalSource(
    '',
    feeds,
    tokenService(),
    new AppsScriptFinvizTransport(),
    diagnostics
  );
  const archiveSignals = createArchiveMarketSignals({
    repository: new GoogleSheetsSignalHistoryRepository(),
    now: () => runtime.now(),
    formatSignalDate: formatAppsScriptSignalDate,
    observe
  });
  try {
    const refresh = createRefreshMarketSignals({
      source,
      strategyCatalog: new GoogleSheetsTradingStrategyCatalog(),
      projection: new GoogleSheetsFinvizSignalProjection(
        Object.fromEntries(feeds.map((feed) => [feed.id, 'Finviz - Momentum'])),
        diagnostics
      ),
      archiveSignals,
      now: () => runtime.now(),
      observe
    });
    return refreshFinvizFromSheets(() => {
      const archived = refresh();
      logger.success({ archived });
      return archived;
    });
  } catch (error) {
    logger.error('REFRESH_MARKET_SIGNALS', error);
    throw error;
  }
}

export function runConfigureFinvizToken(): void {
  configureFinvizTokenFromSheets((token) => tokenService().setToken(token));
}

export function runGetFinvizToken(): string {
  return tokenService().getToken();
}

export function runSetFinvizToken(token: unknown): void {
  tokenService().setToken(token);
}

export function runCheckFinvizAuth(): boolean {
  return checkFinvizAuthFromSheets(() => tokenService().isConfigured());
}

export function runDeleteFinvizToken(): void {
  deleteFinvizTokenFromSheets(() => tokenService().deleteToken());
}
