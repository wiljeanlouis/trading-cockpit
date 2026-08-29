import type { JournalEntry } from '../../../../core/domain/journal-entry';
import type { JournalReader } from '../../../../ports/outbound/journal-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetHeaders } from '../sheet-headers';
import { journalEntryFromRow } from './journal-mapper';
import { validateJournalSchema } from './journal-sheet';

const JOURNAL_SHEET_NAME = 'Journal';

export class GoogleSheetsJournalReader implements JournalReader {
  findAll(): JournalEntry[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(JOURNAL_SHEET_NAME);
    if (!sheet) throw new Error(`${JOURNAL_SHEET_NAME} est absent.`);

    validateJournalSchema(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const headers = readSheetHeaders(sheet);
    const hasAccountId = headers.includes('Account ID');
    const mapperHeaders = hasAccountId ? headers : [...headers, 'Account ID'];

    return sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => journalEntryFromRow(mapperHeaders, hasAccountId ? row : [...row, '']))
      .filter((entry) => Boolean(entry.id));
  }
}
