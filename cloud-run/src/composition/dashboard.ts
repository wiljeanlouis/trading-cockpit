import {
  createGetDashboard,
  dashboardSummaryFrom
} from '@trading-cockpit/backend-core/application/dashboard/get-dashboard';
import { calculateAnalyticsFromJournalEntries } from '@trading-cockpit/backend-core/application/analytics/get-analytics';
import type { DashboardDto, DashboardSummaryDto } from '@trading-cockpit/contracts';
import {
  readDashboardSnapshot,
  readJournalEntries,
  readTradingConfig,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getDashboardForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<DashboardDto> {
  await dependencies.sheets.batchLoad([
    SHEET_DEFINITIONS.momentumRanking,
    SHEET_DEFINITIONS.watchlist,
    SHEET_DEFINITIONS.tradePlans,
    SHEET_DEFINITIONS.positions,
    SHEET_DEFINITIONS.journal,
    SHEET_DEFINITIONS.cockpitConfig
  ]);
  const generatedAt = dependencies.now().toISOString();
  const snapshot = await readDashboardSnapshot(dependencies.sheets);
  const analytics = calculateAnalyticsFromJournalEntries(
    await readJournalEntries(dependencies.sheets),
    generatedAt
  );
  const config = await readTradingConfig(dependencies.sheets);
  return createGetDashboard({
    repository: { readSnapshot: () => snapshot },
    getAnalytics: () => analytics,
    getTradingConfig: () => config,
    now: () => new Date(generatedAt)
  })();
}

export async function getDashboardSummaryForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<DashboardSummaryDto> {
  return dashboardSummaryFrom(await getDashboardForCloudRun(dependencies));
}
