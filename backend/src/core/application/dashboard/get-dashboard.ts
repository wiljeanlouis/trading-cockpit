import type {
  AnalyticsDto,
  DashboardDto,
  DashboardSummaryDto,
  TradingConfigDto
} from '@trading-cockpit/contracts';
import type {
  DashboardPositionSnapshot,
  DashboardRepository,
  DashboardWatchlistSnapshot
} from '../../../ports/outbound/dashboard-repository';

export interface GetDashboardDependencies {
  repository: DashboardRepository;
  getAnalytics: () => AnalyticsDto;
  getTradingConfig: () => TradingConfigDto;
  now: () => Date;
}

function normalized(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function isActiveTradePlanStatus(status: string): boolean {
  return ['DRAFT', 'READY'].includes(normalized(status));
}

function isOpenPositionStatus(status: string): boolean {
  return normalized(status) === 'OPEN';
}

function isRejectedWatchlistStatus(status: string): boolean {
  return normalized(status) === 'REJECTED';
}

function isReadyWatchlistStatus(status: string): boolean {
  return normalized(status) === 'READY';
}

function isNearBreakout(entry: DashboardWatchlistSnapshot): entry is DashboardWatchlistSnapshot & {
  distanceToBreakout: number;
} {
  const status = normalized(entry.status);
  return (
    (status === 'WATCHING' || status === 'READY') &&
    entry.distanceToBreakout !== null &&
    Number.isFinite(entry.distanceToBreakout) &&
    entry.distanceToBreakout >= -0.02 &&
    entry.distanceToBreakout <= 0
  );
}

function stopDistance(position: DashboardPositionSnapshot): number | null {
  if (
    position.currentPrice !== null &&
    Number.isFinite(position.currentPrice) &&
    position.currentPrice > 0 &&
    position.currentStop !== null &&
    Number.isFinite(position.currentStop)
  ) {
    return (position.currentPrice - position.currentStop) / position.currentPrice;
  }

  return null;
}

export function dashboardSummaryFrom(dashboard: DashboardDto): DashboardSummaryDto {
  return dashboard.summary;
}

export function createGetDashboard({
  repository,
  getAnalytics,
  getTradingConfig,
  now
}: GetDashboardDependencies) {
  return (): DashboardDto => {
    const snapshot = repository.readSnapshot();
    const analytics = getAnalytics();
    const account = getTradingConfig();
    const generatedAt = now().toISOString();
    const watchlistWithTicker = snapshot.watchlist.filter((entry) => entry.ticker.trim());
    const openPositions = snapshot.positions.filter((position) =>
      isOpenPositionStatus(position.status)
    );
    const nearBreakout = watchlistWithTicker.filter(isNearBreakout);
    const ready = watchlistWithTicker.filter((entry) => isReadyWatchlistStatus(entry.status));

    const pipeline = {
      signals: snapshot.momentumCandidates.length,
      watchlist: watchlistWithTicker.length,
      ready: ready.length,
      nearBreakout: nearBreakout.length,
      activeTradePlans: snapshot.tradePlans.filter((plan) => isActiveTradePlanStatus(plan.status))
        .length,
      openPositions: openPositions.length,
      closedTrades: analytics.summary.trades
    };

    const openPositionActions = openPositions
      .map((position) => ({
        ticker: position.ticker,
        actualEntry: position.actualEntry,
        currentPrice: position.currentPrice,
        currentStop: position.currentStop,
        unrealizedPnlPercent: position.unrealizedPnlPercent,
        stopDistance: stopDistance(position)
      }))
      .sort((left, right) => {
        if (left.stopDistance === null) return 1;
        if (right.stopDistance === null) return -1;
        return left.stopDistance - right.stopDistance;
      });

    return {
      generatedAt,
      summary: {
        generatedAt,
        signals: pipeline.signals,
        watchlist: pipeline.watchlist,
        ready: pipeline.ready,
        activeTradePlans: pipeline.activeTradePlans,
        openPositions: pipeline.openPositions,
        closedTrades: pipeline.closedTrades
      },
      account,
      pipeline,
      performance: {
        trades: analytics.summary.trades,
        wins: analytics.summary.wins,
        realizedPnl: analytics.summary.totalPnl,
        winRate: analytics.summary.winRate,
        averageR: analytics.summary.averageR,
        totalR: analytics.summary.totalR
      },
      topMomentum: snapshot.momentumCandidates.slice(0, 5),
      watchlistPreview: watchlistWithTicker
        .filter((entry) => !isRejectedWatchlistStatus(entry.status))
        .slice(0, 5),
      openPositionsPreview: openPositions.slice(0, 5).map((position) => ({
        ticker: position.ticker,
        actualEntry: position.actualEntry,
        currentPrice: position.currentPrice,
        currentStop: position.currentStop,
        target: position.target,
        actualQuantity: position.actualQuantity,
        unrealizedPnl: position.unrealizedPnl,
        unrealizedPnlPercent: position.unrealizedPnlPercent
      })),
      actions: {
        nearBreakout: nearBreakout
          .map((entry) => ({
            ticker: entry.ticker,
            distance: entry.distanceToBreakout,
            currentPrice: entry.currentPrice,
            breakoutLevel: entry.breakoutLevel,
            setupStatus: entry.setupStatus
          }))
          .sort((left, right) => Math.abs(left.distance) - Math.abs(right.distance)),
        ready: ready.map((entry) => ({
          ticker: entry.ticker,
          currentPrice: entry.currentPrice,
          breakoutLevel: entry.breakoutLevel,
          setupStatus: entry.setupStatus
        })),
        openPositions: openPositionActions
      }
    };
  };
}
