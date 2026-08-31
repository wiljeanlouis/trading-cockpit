import type {
  MarketSignalBatch,
  MarketSignalFeed
} from '@trading-cockpit/core/domain/market-signal';
import type { MarketSignalSource } from '@trading-cockpit/core/ports/outbound/market-signal-source';

export interface FinvizFeedConfiguration {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  query: string;
}

export interface FinvizHttpResponse {
  status: number;
  content: string;
  contentType?: string;
}

export interface FinvizTransport {
  fetch(url: string): FinvizHttpResponse;
  parseCsv(csv: string): unknown[][];
}

export interface FinvizTokenProvider {
  getToken(): string;
}

export interface FinvizDiagnostics {
  info(event: string, fields: Record<string, unknown>): void;
  error(stage: string, error: unknown): void;
}

function validateConfiguration(config: FinvizFeedConfiguration | undefined): void {
  if (!config) throw new Error('Configuration de screener absente.');
  if (!String(config.strategyId || '').trim()) {
    throw new Error('Strategy ID absent de la configuration du screener.');
  }
  if (!String(config.strategyName || '').trim()) {
    throw new Error(`Strategy absente pour ${config.strategyId}.`);
  }
  if (!String(config.strategyVersion || '').trim()) {
    throw new Error(`Strategy Version absente pour ${config.strategyId}.`);
  }
  if (!String(config.query || '').trim()) {
    throw new Error(`query Finviz absente pour ${config.strategyId}.`);
  }
}

function tickerColumn(headers: unknown[]): number {
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === 'ticker');
  if (index === -1) throw new Error('La colonne Ticker est absente de l’export Finviz.');
  return index;
}

export class FinvizMarketSignalSource implements MarketSignalSource {
  constructor(
    private readonly baseUrl: string,
    private readonly configurations: FinvizFeedConfiguration[],
    private readonly tokenProvider: FinvizTokenProvider,
    private readonly transport: FinvizTransport,
    private readonly diagnostics?: FinvizDiagnostics
  ) {}

  listFeeds(): MarketSignalFeed[] {
    return this.configurations.map((config) => {
      validateConfiguration(config);
      return {
        id: config.id,
        strategyId: config.strategyId,
        strategyName: config.strategyName,
        strategyVersion: config.strategyVersion
      };
    });
  }

  fetchSignals(feedId: string): MarketSignalBatch {
    const config = this.configurations.find((candidate) => candidate.id === feedId);
    validateConfiguration(config);
    let token: string;
    try {
      token = this.tokenProvider.getToken();
    } catch (error) {
      this.diagnostics?.error('AUTH', error);
      throw error;
    }
    this.diagnostics?.info('PROVIDER_REQUEST', {
      provider: 'FINVIZ',
      feedId,
      queryConfigured: true,
      authPresent: Boolean(token)
    });
    let response: FinvizHttpResponse;
    try {
      response = this.transport.fetch(
        `${this.baseUrl}?${config!.query}&auth=${encodeURIComponent(token)}`
      );
    } catch (error) {
      this.diagnostics?.error('HTTP_FETCH', error);
      throw error;
    }
    this.diagnostics?.info('HTTP_RESPONSE', {
      status: response.status,
      chars: response.content.length,
      contentType: response.contentType ?? 'unknown'
    });
    try {
      if (response.status !== 200) {
        throw new Error(`Finviz API error pour ${config!.strategyName}: HTTP ${response.status}`);
      }
      if (!response.content || !response.content.trim()) {
        throw new Error(`Finviz a retourné un CSV vide pour ${config!.strategyName}.`);
      }
    } catch (error) {
      this.diagnostics?.error('INVALID_RESPONSE', error);
      throw error;
    }
    let rows: unknown[][];
    try {
      rows = this.transport.parseCsv(response.content);
    } catch (error) {
      this.diagnostics?.error('CSV_PARSE', error);
      throw error;
    }
    if (!rows || rows.length === 0) {
      const error = new Error(`Aucune donnée Finviz reçue pour ${config!.strategyName}.`);
      this.diagnostics?.error('MALFORMED_CSV', error);
      throw error;
    }
    let headers: string[];
    let tickerIndex: number;
    try {
      headers = rows[0].map((header) => String(header));
      tickerIndex = tickerColumn(headers);
    } catch (error) {
      this.diagnostics?.error('SIGNAL_MAPPING', error);
      throw error;
    }
    this.diagnostics?.info('CSV_PARSED', {
      headers: headers.length,
      rows: Math.max(0, rows.length - 1)
    });
    let batch: MarketSignalBatch;
    try {
      batch = {
        feed: {
          id: config!.id,
          strategyId: config!.strategyId,
          strategyName: config!.strategyName,
          strategyVersion: config!.strategyVersion
        },
        attributeNames: headers,
        signals: rows.slice(1).map((values) => ({
          ticker: String(values[tickerIndex] || '')
            .trim()
            .toUpperCase(),
          attributes: Object.fromEntries(
            headers.map((header, index) => [
              header,
              values[index] === undefined ? '' : values[index]
            ])
          )
        }))
      };
    } catch (error) {
      this.diagnostics?.error('SIGNAL_MAPPING', error);
      throw error;
    }
    this.diagnostics?.info('SIGNALS_MAPPED', {
      signals: batch.signals.length,
      attributes: batch.attributeNames.length
    });
    return batch;
  }
}
