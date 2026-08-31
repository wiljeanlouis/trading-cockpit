import { createGetJournal } from '@trading-cockpit/backend-core/application/journal/get-journal';
import type { JournalDto } from '@trading-cockpit/contracts';
import {
  LoadedJournalReader,
  readJournalEntries
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getJournalForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<JournalDto> {
  return createGetJournal({
    reader: new LoadedJournalReader(await readJournalEntries(dependencies.sheets)),
    now: dependencies.now
  })();
}
