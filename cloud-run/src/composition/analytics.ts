import { createGetAnalytics } from '@trading-cockpit/backend-core/application/analytics/get-analytics';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import {
  LoadedJournalReader,
  readJournalEntries
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getAnalyticsForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<AnalyticsDto> {
  const entries = await readJournalEntries(dependencies.sheets);
  return createGetAnalytics({
    journalReader: new LoadedJournalReader(entries),
    now: dependencies.now
  })();
}
