export interface DashboardPipelineSnapshot {
  signals: number;
  watchlist: number;
  ready: number;
  activeTradePlans: number;
  openPositions: number;
  closedTrades: number;
}

export interface DashboardSummaryRepository {
  readPipelineSnapshot(): DashboardPipelineSnapshot;
}
