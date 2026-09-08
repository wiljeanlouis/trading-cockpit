import type {
  AnalyticsDto,
  DashboardDto,
  DashboardSummaryDto,
  PortfolioScopeDto
} from '@trading-cockpit/contracts';
import type { PortfolioEquitySummary } from '../trading-account/get-portfolio-equity';
import type {
  DashboardPositionSnapshot,
  DashboardRepository,
  DashboardWatchlistSnapshot
} from '../../ports/outbound/dashboard-repository';

export interface GetDashboardDependencies {
  repository: DashboardRepository;
  getAnalytics: () => AnalyticsDto;
  getPortfolioEquity: () => PortfolioEquitySummary;
  now: () => Date;
}

export interface GetDashboardQuery {
  scope?: PortfolioScopeDto;
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

/**
 * Identifies candidates that deserve Dashboard attention without mutating Watchlist workflow.
 */
function isNearTrigger(entry: DashboardWatchlistSnapshot): entry is DashboardWatchlistSnapshot & {
  distanceToTrigger: number;
} {
  const status = normalized(entry.status);
  return (
    (status === 'WATCHING' || status === 'READY') &&
    entry.distanceToTrigger !== null &&
    Number.isFinite(entry.distanceToTrigger) &&
    entry.distanceToTrigger >= -0.02 &&
    entry.distanceToTrigger <= 0
  );
}

/**
 * Applies account scope only to account-owned workflow records.
 *
 * Discovery and Watchlist counters are pre-account opportunity flow and remain global.
 */
function belongsToScope(accountId: string, scope: PortfolioScopeDto): boolean {
  if (scope.type === 'ALL') return true;
  return normalized(accountId) === scope.accountId;
}

/**
 * Computes an open-position triage metric for display only.
 *
 * Current price remains indicative and this value must not trigger execution or closing logic.
 */
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

/**
 * Builds the operational Dashboard from authoritative source snapshots.
 *
 * Pipeline/previews come from the DashboardRepository snapshot, performance comes from the
 * shared Analytics calculation, and account capital comes from the account-equity use case.
 */
export function createGetDashboard({
  repository,
  getAnalytics,
  getPortfolioEquity,
  now
}: GetDashboardDependencies) {
  return (_query: GetDashboardQuery = {}): DashboardDto => {
    const snapshot = repository.readSnapshot();
    const analytics = getAnalytics();
    const equity = getPortfolioEquity();
    const generatedAt = now().toISOString();
    const watchlistWithTicker = snapshot.watchlist.filter((entry) => entry.ticker.trim());
    const scopedTradePlans = snapshot.tradePlans.filter((plan) =>
      belongsToScope(plan.accountId, equity.scope)
    );
    const scopedPositions = snapshot.positions.filter((position) =>
      belongsToScope(position.accountId, equity.scope)
    );
    const openPositions = scopedPositions.filter((position) =>
      isOpenPositionStatus(position.status)
    );
    const nearTrigger = watchlistWithTicker.filter(isNearTrigger);
    const ready = watchlistWithTicker.filter((entry) => isReadyWatchlistStatus(entry.status));

    const pipeline = {
      signals: snapshot.discoveryCandidates.length,
      watchlist: watchlistWithTicker.length,
      ready: ready.length,
      nearTrigger: nearTrigger.length,
      activeTradePlans: scopedTradePlans.filter((plan) => isActiveTradePlanStatus(plan.status))
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
      account: {
        accountName: equity.accountName,
        accountEquity: equity.realizedEquity,
        defaultRiskPercent: 0,
        maxPositionPercent: 0,
        currency: equity.baseCurrency,
        scope: equity.scope,
        accountId: equity.accountId,
        netExternalCapital: equity.netExternalCapital,
        realizedPnl: equity.realizedPnl,
        realizedEquity: equity.realizedEquity,
        baseCurrency: equity.baseCurrency,
        accountCount: equity.accountCount
      },
      pipeline,
      performance: {
        trades: analytics.summary.trades,
        wins: analytics.summary.wins,
        losses: analytics.summary.losses,
        breakeven: analytics.summary.breakeven,
        realizedPnl: analytics.summary.totalPnl,
        netExternalCapital: equity.netExternalCapital,
        realizedEquity: equity.realizedEquity,
        winRate: analytics.summary.winRate,
        profitFactor: analytics.summary.profitFactor,
        averageR: analytics.summary.averageR,
        totalR: analytics.summary.totalR
      },
      topDiscoveryCandidates: snapshot.discoveryCandidates.slice(0, 5),
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
        nearTrigger: nearTrigger
          .map((entry) => ({
            ticker: entry.ticker,
            distance: entry.distanceToTrigger,
            currentPrice: entry.currentPrice,
            triggerLevel: entry.triggerLevel,
            setupStatus: entry.setupStatus
          }))
          .sort((left, right) => Math.abs(left.distance) - Math.abs(right.distance)),
        ready: ready.map((entry) => ({
          ticker: entry.ticker,
          currentPrice: entry.currentPrice,
          triggerLevel: entry.triggerLevel,
          setupStatus: entry.setupStatus
        })),
        openPositions: openPositionActions
      }
    };
  };
}
