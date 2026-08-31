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
import { createArchiveMarketSignals } from '@trading-cockpit/backend-core/application/market-signals/archive-market-signals';
import { createRefreshMarketSignals } from '@trading-cockpit/backend-core/application/market-signals/refresh-market-signals';

const FINVIZ_BASE_URL = 'https://elite.finviz.com/export/screener';
const MOMENTUM_FEED_ID = 'MOMENTUM_BREAKOUT_V1';
const FINVIZ_FEEDS: FinvizFeedConfiguration[] = [
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

function tokenService(): FinvizTokenService {
  return new FinvizTokenService(new AppsScriptFinvizTokenStorage());
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
  const source = new FinvizMarketSignalSource(
    FINVIZ_BASE_URL,
    FINVIZ_FEEDS,
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
        { [MOMENTUM_FEED_ID]: 'Finviz - Momentum' },
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
