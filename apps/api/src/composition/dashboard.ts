import {
  createGetDashboard,
  dashboardSummaryFrom
} from '@trading-cockpit/core/application/dashboard/get-dashboard';
import { calculateAnalyticsFromJournalEntries } from '@trading-cockpit/core/application/analytics/get-analytics';
import { calculatePortfolioEquitySummary } from '@trading-cockpit/core/application/trading-account/get-portfolio-equity';
import type { DashboardDto, DashboardSummaryDto } from '@trading-cockpit/contracts';
import {
  readCapitalTransactions,
  readDashboardSnapshot,
  readJournalEntries,
  readTradingAccounts,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import type { RequestContext } from '../http/request-context';

export async function getDashboardForCloudRun(dependencies: {
  context: RequestContext;
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<DashboardDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.tradePlans,
    SHEET_DEFINITIONS.positions,
    SHEET_DEFINITIONS.journal,
    SHEET_DEFINITIONS.accounts,
    SHEET_DEFINITIONS.capitalLedger
  ]);
  const generatedAt = dependencies.now().toISOString();
  const accountId = accountScopeFromQuery(dependencies.context.query);
  const scope = accountId ? { type: 'ACCOUNT' as const, accountId } : { type: 'ALL' as const };
  const snapshot = await readDashboardSnapshot(dependencies.sheets);
  const accounts = await readTradingAccounts(dependencies.sheets);
  const transactions = await readCapitalTransactions(dependencies.sheets);
  const journalEntries = await readJournalEntries(dependencies.sheets);
  const analytics = calculateAnalyticsFromJournalEntries(
    journalEntries,
    generatedAt,
    true,
    { scope },
    accounts
  );
  const equity = calculatePortfolioEquitySummary({
    accounts,
    transactions,
    journalEntries,
    scope
  });

  return createGetDashboard({
    repository: { readSnapshot: () => snapshot },
    getAnalytics: () => analytics,
    getPortfolioEquity: () => equity,
    now: () => new Date(generatedAt)
  })();
}

export async function getDashboardSummaryForCloudRun(dependencies: {
  context: RequestContext;
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<DashboardSummaryDto> {
  return dashboardSummaryFrom(await getDashboardForCloudRun(dependencies));
}

function accountScopeFromQuery(query: URLSearchParams): string | null {
  const accountId = String(query.get('accountId') || '')
    .trim()
    .toUpperCase();
  return accountId || null;
}
