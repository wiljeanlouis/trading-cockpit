export interface PositionItemDto {
  id: string;
  accountId: string;
  tradePlanId: string;
  watchlistId: string;
  ticker: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  openedAt: string | null;
  plannedEntry: number | null;
  actualEntry: number | null;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  initialStop: number | null;
  currentStop: number | null;
  target: number | null;
  plannedMaxRisk: number | null;
  plannedRiskReward: number | null;
  currentPrice: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  status: string;
  notes: string | null;
}

export interface OpenPositionsDto {
  generatedAt: string;
  items: PositionItemDto[];
}

export interface ClosePositionRequest {
  positionId: string;
  exitPrice: number;
}

export interface ClosePositionResponse {
  positionId: string;
  accountId: string;
  ticker: string;
  status: string;
  closedAt: string | null;
  exitPrice: number;
  realizedPnl: number | null;
  journalCreated: boolean;
}
