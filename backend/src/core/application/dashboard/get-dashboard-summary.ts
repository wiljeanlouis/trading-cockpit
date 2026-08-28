import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { DashboardSummaryRepository } from '../../../ports/outbound/dashboard-summary-repository';

export interface GetDashboardSummaryDependencies {
  repository: DashboardSummaryRepository;
  now: () => Date;
}

export type GetDashboardSummary = () => DashboardSummaryDto;

export function createGetDashboardSummary(
  dependencies: GetDashboardSummaryDependencies
): GetDashboardSummary {
  return () => {
    const snapshot = dependencies.repository.readPipelineSnapshot();
    return {
      generatedAt: dependencies.now().toISOString(),
      ...snapshot
    };
  };
}
