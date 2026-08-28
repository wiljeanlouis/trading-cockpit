import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from './cockpit-gateway';

const DEVELOPMENT_SUMMARY: DashboardSummaryDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  signals: 18,
  watchlist: 8,
  ready: 3,
  activeTradePlans: 2,
  openPositions: 1,
  closedTrades: 14
};

export class MockCockpitGateway implements CockpitGateway {
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...DEVELOPMENT_SUMMARY, generatedAt: new Date().toISOString() };
  }
}
