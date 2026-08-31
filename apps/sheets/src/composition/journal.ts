import type { JournalDto } from '@trading-cockpit/contracts';
import { GoogleSheetsJournalReader } from '../adapters/outbound/google-sheets/journal/google-sheets-journal-reader';
import { createGetJournal } from '@trading-cockpit/core/application/journal/get-journal';

export function runGetJournal(): JournalDto {
  return createGetJournal({
    reader: new GoogleSheetsJournalReader(),
    now: () => new Date()
  })();
}
