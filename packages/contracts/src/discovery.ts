export interface DiscoveryCandidateDto {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: string | null;
  detectedAt: string | null;
  ticker: string;
  company: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  marketCap: string | number | null;
  volume: number | null;
  price: number | null;
  change: number | null;
  averageVolume: number | null;
  relativeVolume: number | null;
  rsi: number | null;
  high52: number | null;
  performanceWeek: number | null;
  performanceMonth: number | null;
  earningsDate: string | null;
  attributes: Record<string, string | number | boolean | null>;
  watchlistStatus: string | null;
}

export interface DiscoveryStrategyDto {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  screener: string;
}

export interface DiscoveryDto {
  generatedAt: string;
  strategies: DiscoveryStrategyDto[];
  items: DiscoveryCandidateDto[];
}

export interface RefreshSignalsRequest {
  strategyId: string;
}

export interface RefreshSignalsResponse {
  scope: 'STRATEGY' | 'ALL';
  archived: number;
  refreshed: Array<{
    strategyId: string;
    strategyVersion: string;
    signalCount: number;
    archived: number;
  }>;
}

export interface AddDiscoveryCandidateToWatchlistRequest {
  strategyId: string;
  strategyVersion: string;
  signalDate: string;
  ticker: string;
}

export type AddDiscoveryCandidateToWatchlistResponse =
  | {
      kind: 'added';
      watchlistId: string;
      ticker: string;
      status: string;
    }
  | {
      kind: 'duplicate';
      watchlistId: string;
      ticker: string;
      status: string;
    };
