export interface DashboardMomentumCandidateSnapshot {
  rank: number | null;
  ticker: string;
  score: number | null;
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
  breakoutLevel: number | null;
  distanceToBreakout: number | null;
  setupStatus: string | null;
  status: string;
}

export interface DashboardTradePlanSnapshot {
  status: string;
}

export interface DashboardPositionSnapshot {
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
  momentumCandidates: DashboardMomentumCandidateSnapshot[];
  watchlist: DashboardWatchlistSnapshot[];
  tradePlans: DashboardTradePlanSnapshot[];
  positions: DashboardPositionSnapshot[];
}

export interface DashboardRepository {
  readSnapshot(): DashboardRepositorySnapshot;
}
