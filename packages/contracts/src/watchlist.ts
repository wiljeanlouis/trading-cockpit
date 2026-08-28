export interface WatchlistItemDto {
  id: string;
  ticker: string;
  company: string | null;
  sector: string | null;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: string | null;
  currentPrice: number | null;
  momentumScore: number | null;
  status: string;
  setupStatus: string;
}

export interface WatchlistDto {
  generatedAt: string;
  items: WatchlistItemDto[];
}
