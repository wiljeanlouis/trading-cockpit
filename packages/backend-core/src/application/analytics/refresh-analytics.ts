import type { AnalyticsDto } from '@trading-cockpit/contracts';

export interface AnalyticsProjection {
  replace(analytics: AnalyticsDto): void;
}

export interface RefreshAnalyticsDependencies {
  getAnalytics: () => AnalyticsDto;
  projection: AnalyticsProjection;
}

export function createRefreshAnalytics({ getAnalytics, projection }: RefreshAnalyticsDependencies) {
  return (): AnalyticsDto => {
    const analytics = getAnalytics();
    projection.replace(analytics);
    return analytics;
  };
}
