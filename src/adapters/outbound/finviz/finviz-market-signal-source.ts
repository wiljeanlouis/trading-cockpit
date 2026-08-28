import type { MarketSignalBatch, MarketSignalFeed } from '../../../core/domain/market-signal';
import type { MarketSignalSource } from '../../../ports/outbound/market-signal-source';

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
}

export interface FinvizTransport {
  fetch(url: string): FinvizHttpResponse;
  parseCsv(csv: string): unknown[][];
}

export interface FinvizTokenProvider {
  getToken(): string;
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
    private readonly transport: FinvizTransport
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
    const response = this.transport.fetch(
      `${this.baseUrl}?${config!.query}&auth=${encodeURIComponent(this.tokenProvider.getToken())}`
    );
    if (response.status !== 200) {
      throw new Error(`Finviz API error pour ${config!.strategyName}: HTTP ${response.status}`);
    }
    if (!response.content || !response.content.trim()) {
      throw new Error(`Finviz a retourné un CSV vide pour ${config!.strategyName}.`);
    }
    const rows = this.transport.parseCsv(response.content);
    if (!rows || rows.length === 0) {
      throw new Error(`Aucune donnée Finviz reçue pour ${config!.strategyName}.`);
    }
    const headers = rows[0].map((header) => String(header));
    const tickerIndex = tickerColumn(headers);
    return {
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
        attributes: Object.fromEntries(headers.map((header, index) => [header, values[index]]))
      }))
    };
  }
}
