export interface AnalyticsSummaryDto {
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  profitFactor: number | null;
  totalPnl: number;
  realizedPnl: number;
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

export type PortfolioScopeDto = { type: 'ALL' } | { type: 'ACCOUNT'; accountId: string };

export interface AnalyticsAccountRowDto {
  accountId: string;
  accountName: string | null;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  realizedPnl: number;
  profitFactor: number | null;
  totalR: number;
  averageR: number;
}

export interface AnalyticsDto {
  generatedAt: string;
  available: boolean;
  scope?: PortfolioScopeDto;
  summary: AnalyticsSummaryDto;
  byStrategy: AnalyticsStrategyRowDto[];
  byStrategyVersion: AnalyticsStrategyVersionRowDto[];
  byAccount?: AnalyticsAccountRowDto[];
}
