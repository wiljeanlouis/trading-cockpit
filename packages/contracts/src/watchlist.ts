export interface WatchlistItemDto {
  id: string;
  ticker: string;
  company: string | null;
  sector: string | null;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: string | null;
  signalPrice: number | null;
  currentPrice: number | null;
  status: string;
  setupStatus: string;
  triggerLevel: number | null;
  invalidationLevel: number | null;
  earningsDate: string | null;
  eventRisk: string | null;
  notes: string | null;
}

export interface WatchlistDto {
  generatedAt: string;
  items: WatchlistItemDto[];
}
