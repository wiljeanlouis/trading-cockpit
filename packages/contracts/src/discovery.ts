export interface DiscoveryCandidateDto {
  strategyId: string;
  strategyName: string;
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
  strategyType: string;
}

export interface DiscoveryDto {
  generatedAt: string;
  strategies: DiscoveryStrategyDto[];
  items: DiscoveryCandidateDto[];
}

export interface RunDiscoveryRequest {
  strategyId: string;
  finvizUrl: string;
}

export interface RunDiscoveryResponse {
  strategyId: string;
  archived: number;
  signalCount: number;
}

export interface AddDiscoveryCandidateToWatchlistRequest {
  strategyId: string;
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
