export interface AnalyticsSummaryDto {
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  profitFactor: number | null;
  totalPnl: number;
  averagePnl: number;
  bestPnl: number;
  grossProfit: number;
  grossLoss: number;
  worstPnl: number;
  totalR: number;
  averageR: number;
  expectancyR: number;
  averageWinnerR: number;
  averageLoserR: number;
  bestR: number;
}

export interface AnalyticsStrategyRowDto {
  strategyId: string;
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  averageR: number;
  totalR: number;
}

export interface AnalyticsStrategyVersionRowDto {
  strategyId: string;
  strategy: string;
  version: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  averageR: number;
  totalR: number;
}

export interface AnalyticsDto {
  generatedAt: string;
  available: boolean;
  summary: AnalyticsSummaryDto;
  byStrategy: AnalyticsStrategyRowDto[];
  byStrategyVersion: AnalyticsStrategyVersionRowDto[];
}
