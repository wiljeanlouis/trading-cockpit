export type JournalOutcomeDto = 'WIN' | 'LOSS' | 'BREAKEVEN' | null;

export interface JournalItemDto {
  id: string;
  positionId: string;
  accountId: string;
  tradePlanId: string;
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
  openedAt: string | null;
  closedAt: string | null;
  plannedEntry: number | null;
  actualEntry: number | null;
  exitPrice: number | null;
  quantity: number | null;
  initialStop: number | null;
  target: number | null;
  plannedMaxRisk: number | null;
  plannedRiskReward: number | null;
  realizedPnl: number | null;
  returnPercent: number | null;
  rMultiple: number | null;
  outcome: JournalOutcomeDto;
  exitReason: string | null;
  executionNotes: string | null;
  lessonsLearned: string | null;
  followedPlan: string | null;
}

export interface JournalDto {
  generatedAt: string;
  items: JournalItemDto[];
}
