import type {
  MarketSignalBatch,
  MarketSignalFeed
} from '@trading-cockpit/core/domain/market-signal';
import type { MarketSignalSource } from '@trading-cockpit/core/ports/outbound/market-signal-source';
import type { AsyncFinvizTokenService } from './finviz-token-service';
import type { FinvizTransport } from './node-finviz-transport';

export interface FinvizFeedConfiguration {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  query: string;
}

const FINVIZ_REQUEST_INTERVAL_MS = 5_000;

/**
 * Cloud Run implementation of the provider-neutral MarketSignalSource port for Finviz.
 *
 * This adapter owns all vendor-specific concerns: credentials, URL construction, HTTP
 * transport, CSV parsing and Finviz request pacing. Core only sees market-signal feeds.
 */
export class CloudRunFinvizMarketSignalSource implements MarketSignalSource {
  private fetched = new Map<string, MarketSignalBatch>();

  constructor(
    private readonly baseUrl: string,
    private readonly configurations: readonly FinvizFeedConfiguration[],
    private readonly tokenService: AsyncFinvizTokenService,
    private readonly transport: FinvizTransport,
    private readonly wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms))
  ) {}

  /**
   * Exposes feed identity without leaking Finviz query strings to application/core code.
   */
  listFeeds(): MarketSignalFeed[] {
    return this.configurations.map((config) => ({
      id: config.id,
      strategyId: config.strategyId,
      strategyName: config.strategyName,
      strategyVersion: config.strategyVersion
    }));
  }

  /**
   * Returns a preloaded batch synchronously because the core market-signal port is synchronous.
   */
  fetchSignals(feedId: string): MarketSignalBatch {
    const batch = this.fetched.get(feedId);
    if (!batch) throw new Error(`Finviz feed ${feedId} was not preloaded.`);
    return batch;
  }

  /**
   * Performs the actual asynchronous Finviz calls before the core use case runs.
   *
   * The first request is immediate; subsequent requests wait five seconds to respect the
   * provider constraint without putting rate-limit behavior in React or Core.
   */
  async preload(): Promise<void> {
    const token = await this.tokenService.getToken();
    for (const [index, config] of this.configurations.entries()) {
      if (index > 0) await this.wait(FINVIZ_REQUEST_INTERVAL_MS);
      const response = await this.transport.fetch(this.urlFor(config, token));
      if (response.status !== 200) {
        throw new Error(`Finviz API error pour ${config.strategyName}: HTTP ${response.status}`);
      }
      if (!response.content.trim()) {
        throw new Error(`Finviz a retourné un CSV vide pour ${config.strategyName}.`);
      }
      const rows = this.transport.parseCsv(response.content);
      if (rows.length === 0)
        throw new Error(`Aucune donnée Finviz reçue pour ${config.strategyName}.`);
      const headers = rows[0].map((header) => String(header));
      const tickerIndex = headers.findIndex((header) => header.trim().toLowerCase() === 'ticker');
      if (tickerIndex < 0) throw new Error('La colonne Ticker est absente de l’export Finviz.');
      this.fetched.set(config.id, {
        feed: {
          id: config.id,
          strategyId: config.strategyId,
          strategyName: config.strategyName,
          strategyVersion: config.strategyVersion
        },
        attributeNames: headers,
        signals: rows.slice(1).map((values) => ({
          ticker: String(values[tickerIndex] || '')
            .trim()
            .toUpperCase(),
          attributes: Object.fromEntries(
            headers.map((header, index) => [header, values[index] ?? ''])
          )
        }))
      });
    }
  }

  /**
   * Builds the final Finviz export URL from either a complete URL or a query-string config.
   */
  private urlFor(config: FinvizFeedConfiguration, token: string): string {
    const separator = config.query.includes('?') ? '&' : '?';
    if (/^https?:\/\//i.test(config.query)) {
      return `${config.query}${separator}auth=${encodeURIComponent(token)}`;
    }
    return `${this.baseUrl}?${config.query}&auth=${encodeURIComponent(token)}`;
  }
}
