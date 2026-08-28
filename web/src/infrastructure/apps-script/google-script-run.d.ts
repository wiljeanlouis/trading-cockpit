import type { DashboardSummaryDto } from '@trading-cockpit/contracts';

interface DashboardScriptRunner {
  withSuccessHandler(handler: (value: DashboardSummaryDto) => void): DashboardScriptRunner;
  withFailureHandler(handler: (error: unknown) => void): DashboardScriptRunner;
  getDashboardSummary(): void;
}

declare global {
  const google: {
    script: {
      run: DashboardScriptRunner;
    };
  };
}

export {};
