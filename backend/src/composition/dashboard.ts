import { GoogleSheetsDashboardSummaryRepository } from '../adapters/outbound/google-sheets/dashboard/google-sheets-dashboard-summary-repository';
import { createGetDashboardSummary } from '../core/application/dashboard/get-dashboard-summary';

export function runGetDashboardSummary() {
  return createGetDashboardSummary({
    repository: new GoogleSheetsDashboardSummaryRepository(),
    now: () => new Date()
  })();
}
