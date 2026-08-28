import type { DashboardSummaryDto } from '@trading-cockpit/contracts';

export interface CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
}
