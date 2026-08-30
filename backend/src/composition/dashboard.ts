import type { DashboardDto, DashboardSummaryDto } from '@trading-cockpit/contracts';
import { GoogleSheetsDashboardRepository } from '../adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-repository';
import { projectDashboardToSheet } from '../adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-projection';
import {
  createGetDashboard,
  dashboardSummaryFrom
} from '../core/application/dashboard/get-dashboard';
import { runGetAnalytics } from './analytics';
import { runGetLegacyTradingConfiguration } from './configuration';

export function runGetDashboard(): DashboardDto {
  return createGetDashboard({
    repository: new GoogleSheetsDashboardRepository(),
    getAnalytics: () => runGetAnalytics(),
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
