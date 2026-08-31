import type { DashboardDto, DashboardSummaryDto } from '@trading-cockpit/contracts';
import { GoogleSheetsDashboardRepository } from '../adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-repository';
import { projectDashboardToSheet } from '../adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-projection';
import { GoogleSheetsJournalReader } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-reader';
import { calculateAnalyticsFromJournalEntries } from '@trading-cockpit/core/application/analytics/get-analytics';
import {
  createGetDashboard,
  dashboardSummaryFrom
} from '@trading-cockpit/core/application/dashboard/get-dashboard';
import { runGetLegacyTradingConfiguration } from './configuration';

function getDashboardAnalytics() {
  const generatedAt = new Date().toISOString();
  try {
    return calculateAnalyticsFromJournalEntries(
      new GoogleSheetsJournalReader().findAll(),
      generatedAt
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Journal est absent')) {
      return calculateAnalyticsFromJournalEntries([], generatedAt, false);
    }
    throw error;
  }
}

export function runGetDashboard(): DashboardDto {
  return createGetDashboard({
    repository: new GoogleSheetsDashboardRepository(),
    getAnalytics: () => getDashboardAnalytics(),
    getTradingConfig: () => runGetLegacyTradingConfiguration(),
    now: () => new Date()
  })();
}

export function runGetDashboardSummary(): DashboardSummaryDto {
  return dashboardSummaryFrom(runGetDashboard());
}

export function runRefreshDashboard(): DashboardDto {
  const dashboard = runGetDashboard();
  projectDashboardToSheet(dashboard);
  return dashboard;
}
