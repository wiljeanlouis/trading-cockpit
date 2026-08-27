import type { JournalEntry } from '../../../core/domain/journal-entry';
import type { JournalRepository } from '../../../ports/outbound/journal-repository';
import { journalEntryFromRow, journalEntryToRow } from './journal-mapper';

declare function getOrCreateJournalSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validateJournalSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addJournalFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatJournalRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function themeJournal(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export class GoogleSheetsJournalRepository implements JournalRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;

  findByPositionId(positionId: string): JournalEntry | null {
    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const headers = this.headers(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalized = String(positionId || '').trim();
    for (const row of rows) {
      const entry = journalEntryFromRow(headers, row);
      if (entry.positionId === normalized) return entry;
    }
    return null;
  }

  save(entry: JournalEntry): void {
    const sheet = this.getSheet();
    sheet.appendRow(journalEntryToRow(entry));
    const row = sheet.getLastRow();
    addJournalFormulas(sheet, row);
    formatJournalRow(sheet, row);
    themeJournal(SpreadsheetApp.getActiveSpreadsheet());
  }

  private getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreateJournalSheet();
      validateJournalSchema(this.sheet);
    }
    return this.sheet;
  }

  private headers(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
    return sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
  }
}
