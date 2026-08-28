export interface DashboardSummaryDto {
  generatedAt: string;
  signals: number;
  watchlist: number;
  ready: number;
  activeTradePlans: number;
  openPositions: number;
  closedTrades: number;
}
