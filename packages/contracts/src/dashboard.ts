export interface DashboardSummaryDto {
  generatedAt: string;
  signals: number;
  watchlist: number;
  ready: number;
  activeTradePlans: number;
  openPositions: number;
  closedTrades: number;
}

export interface DashboardPipelineDto {
  signals: number;
  watchlist: number;
  ready: number;
  nearBreakout: number;
  activeTradePlans: number;
  openPositions: number;
  closedTrades: number;
}

export interface DashboardPerformanceDto {
  trades: number;
  wins: number;
  realizedPnl: number;
  winRate: number;
  averageR: number;
  totalR: number;
}

export interface DashboardAccountDto {
  accountName: string;
  accountEquity: number;
  defaultRiskPercent: number;
  maxPositionPercent: number;
  currency: string;
}

export interface DashboardMomentumCandidateDto {
  rank: number | null;
  ticker: string;
  score: number | null;
  price: number | null;
  high52: number | null;
  relativeVolume: number | null;
  rsi: number | null;
  reviewStatus: string | null;
}

export interface DashboardWatchlistPreviewDto {
  ticker: string;
  currentPrice: number | null;
  signalPrice: number | null;
  changeSinceSignal: number | null;
  breakoutLevel: number | null;
  distanceToBreakout: number | null;
  setupStatus: string | null;
  status: string;
}

export interface DashboardPositionPreviewDto {
  ticker: string;
  actualEntry: number | null;
  currentPrice: number | null;
  currentStop: number | null;
  target: number | null;
  actualQuantity: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
}

export interface DashboardNearBreakoutActionDto {
  ticker: string;
  distance: number;
  currentPrice: number | null;
  breakoutLevel: number | null;
  setupStatus: string | null;
}

export interface DashboardReadyActionDto {
  ticker: string;
  currentPrice: number | null;
  breakoutLevel: number | null;
  setupStatus: string | null;
}

export interface DashboardOpenPositionActionDto {
  ticker: string;
  actualEntry: number | null;
  currentPrice: number | null;
  currentStop: number | null;
  unrealizedPnlPercent: number | null;
  stopDistance: number | null;
}

export interface DashboardActionsDto {
  nearBreakout: DashboardNearBreakoutActionDto[];
  ready: DashboardReadyActionDto[];
  openPositions: DashboardOpenPositionActionDto[];
}

export interface DashboardDto {
  generatedAt: string;
  summary: DashboardSummaryDto;
  account: DashboardAccountDto;
  pipeline: DashboardPipelineDto;
  performance: DashboardPerformanceDto;
  topMomentum: DashboardMomentumCandidateDto[];
  watchlistPreview: DashboardWatchlistPreviewDto[];
  openPositionsPreview: DashboardPositionPreviewDto[];
  actions: DashboardActionsDto;
}
