import type { JournalEntry } from '../../../../core/domain/journal-entry';
import type { JournalRepository } from '../../../../ports/outbound/journal-repository';
import {
  journalEntriesFromRowsForAccount,
  journalEntriesFromRowsForPosition,
  journalEntryToRow
} from './journal-mapper';
import {
  addJournalFormulas,
  ensureJournalAccountColumn,
  formatJournalRow,
  getOrCreateJournalSheet,
  validateJournalSchema
} from './journal-sheet';
import { readSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
declare function themeJournal(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export class GoogleSheetsJournalRepository implements JournalRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;

  findByPositionId(positionId: string): JournalEntry | null {
    return this.findAllByPositionId(positionId)[0] ?? null;
  }

  findAllByPositionId(positionId: string): JournalEntry[] {
    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    const headers = readSheetHeaders(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    return journalEntriesFromRowsForPosition(headers, rows, positionId);
  }

  findClosedByAccountId(accountId: string): JournalEntry[] {
    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    const headers = readSheetHeaders(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    return journalEntriesFromRowsForAccount(headers, rows, accountId);
  }

  save(entry: JournalEntry): void {
    const sheet = this.getSheet();
    sheet.appendRow(journalEntryToRow(entry));
    const row = sheet.getLastRow();
    addJournalFormulas(sheet, row);
    formatJournalRow(sheet, row);
    themeJournal(getTradingCockpitSpreadsheet());
  }

  private getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreateJournalSheet();
      validateJournalSchema(this.sheet);
      ensureJournalAccountColumn(this.sheet);
    }
    return this.sheet;
  }
}
