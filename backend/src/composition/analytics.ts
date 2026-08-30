import type { AnalyticsDto } from '@trading-cockpit/contracts';
import { projectAnalyticsToSheet } from '../adapters/outbound/google-sheets/analytics/google-sheets-analytics-projection';
import { GoogleSheetsJournalReader } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-reader';
import { createGetAnalytics } from '../core/application/analytics/get-analytics';
import { createRefreshAnalytics } from '../core/application/analytics/refresh-analytics';

export function runGetAnalytics(): AnalyticsDto {
  return createGetAnalytics({
    journalReader: new GoogleSheetsJournalReader(),
    now: () => new Date()
  })();
}

export function runRefreshAnalytics(): AnalyticsDto {
  const getAnalytics = () => runGetAnalytics();
  return createRefreshAnalytics({
    getAnalytics,
    projection: { replace: projectAnalyticsToSheet }
  })();
}
