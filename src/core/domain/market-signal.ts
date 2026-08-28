export interface MarketSignalFeed {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
}

export interface MarketSignal {
  ticker: string;
  attributes: Record<string, unknown>;
}

export interface MarketSignalBatch {
  feed: MarketSignalFeed;
  attributeNames: string[];
  signals: MarketSignal[];
}

export interface SignalSnapshot {
  signalDate: string;
  detectedAt: Date;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
  attributes: Record<string, unknown>;
}

export function validateMarketSignalFeed(feed: MarketSignalFeed | null): void {
  if (!feed) throw new Error('Configuration de screener absente.');
  if (!String(feed.id || '').trim()) throw new Error('Signal Feed ID absent.');
  if (!String(feed.strategyId || '').trim()) {
    throw new Error('Strategy ID absent de la configuration du screener.');
  }
  if (!String(feed.strategyName || '').trim()) {
    throw new Error(`Strategy absente pour ${feed.strategyId}.`);
  }
  if (!String(feed.strategyVersion || '').trim()) {
    throw new Error(`Strategy Version absente pour ${feed.strategyId}.`);
  }
}

export function buildSignalKey(
  date: unknown,
  strategyId: unknown,
  version: unknown,
  ticker: unknown
): string {
  return [
    String(date || '').trim(),
    String(strategyId || '')
      .trim()
      .toUpperCase(),
    String(version || '').trim(),
    String(ticker || '')
      .trim()
      .toUpperCase()
  ].join('|');
}
