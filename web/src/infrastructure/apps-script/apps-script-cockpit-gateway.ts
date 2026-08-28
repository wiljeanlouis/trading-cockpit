import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../cockpit-gateway';

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error || 'Unknown Apps Script error');
}

export class AppsScriptCockpitGateway implements CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getDashboardSummary();
    });
  }
}
