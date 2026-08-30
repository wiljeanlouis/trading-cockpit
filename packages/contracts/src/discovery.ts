export interface MomentumRankingItemDto {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: string | null;
  ticker: string;
  company: string | null;
  sector: string | null;
  price: number | null;
  high52: number | null;
  high52Score: number | null;
  relativeVolume: number | null;
  relativeVolumeScore: number | null;
  performanceMonth: number | null;
  performanceScore: number | null;
  rsi: number | null;
  rsiScore: number | null;
  sma20: number | null;
  sma20Score: number | null;
  momentumScore: number | null;
  reviewStatus: string;
  watchlistStatus: string | null;
}

export interface MomentumRankingDto {
  generatedAt: string;
  items: MomentumRankingItemDto[];
}

export interface AddMomentumCandidateToWatchlistRequest {
  strategyId: string;
  strategyVersion: string;
  signalDate: string;
  ticker: string;
}

export type AddMomentumCandidateToWatchlistResponse =
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
