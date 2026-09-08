export interface DashboardDiscoveryCandidateSnapshot {
  rank: number | null;
  ticker: string;
  price: number | null;
  high52: number | null;
  relativeVolume: number | null;
  rsi: number | null;
  reviewStatus: string | null;
}

export interface DashboardWatchlistSnapshot {
  ticker: string;
  currentPrice: number | null;
  signalPrice: number | null;
  changeSinceSignal: number | null;
  triggerLevel: number | null;
  distanceToTrigger: number | null;
  setupStatus: string | null;
  status: string;
}

export interface DashboardTradePlanSnapshot {
  accountId: string;
  status: string;
}

export interface DashboardPositionSnapshot {
  accountId: string;
  ticker: string;
  actualEntry: number | null;
  currentPrice: number | null;
  currentStop: number | null;
  target: number | null;
  actualQuantity: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  status: string;
}

export interface DashboardRepositorySnapshot {
  discoveryCandidates: DashboardDiscoveryCandidateSnapshot[];
  watchlist: DashboardWatchlistSnapshot[];
  tradePlans: DashboardTradePlanSnapshot[];
  positions: DashboardPositionSnapshot[];
}

export interface DashboardRepository {
  readSnapshot(): DashboardRepositorySnapshot;
}
