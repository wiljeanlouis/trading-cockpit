import type { JournalEntry } from '@trading-cockpit/backend-core/domain/journal-entry';
import type { JournalReader } from '@trading-cockpit/backend-core/ports/outbound/journal-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable } from '../sheet-headers';
import { journalEntryFromRow } from './journal-mapper';
import { validateJournalHeaders } from './journal-sheet';

const JOURNAL_SHEET_NAME = 'Journal';

export class GoogleSheetsJournalReader implements JournalReader {
  findAll(): JournalEntry[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(JOURNAL_SHEET_NAME);
    if (!sheet) throw new Error(`${JOURNAL_SHEET_NAME} est absent.`);

    const { headers, rows } = readSheetTable(sheet);
    validateJournalHeaders(headers);
    const hasAccountId = headers.includes('Account ID');
    const mapperHeaders = hasAccountId ? headers : [...headers, 'Account ID'];

    return rows
      .map((row) => journalEntryFromRow(mapperHeaders, hasAccountId ? row : [...row, '']))
      .filter((entry) => Boolean(entry.id));
  }
}
