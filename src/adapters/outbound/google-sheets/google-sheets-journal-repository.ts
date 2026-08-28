import type { JournalEntry } from '../../../core/domain/journal-entry';
import type { JournalRepository } from '../../../ports/outbound/journal-repository';
import {
  journalEntriesFromRowsForAccount,
  journalEntriesFromRowsForPosition,
  journalEntryToRow
} from './journal-mapper';

declare function getOrCreateJournalSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validateJournalSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addJournalFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatJournalRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
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
    const headers = this.headers(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    return journalEntriesFromRowsForPosition(headers, rows, positionId);
  }

  findClosedByAccountId(accountId: string): JournalEntry[] {
    const sheet = this.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    const headers = this.headers(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    return journalEntriesFromRowsForAccount(headers, rows, accountId);
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
      this.ensureAccountColumn(this.sheet);
    }
    return this.sheet;
  }

  private ensureAccountColumn(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
    const headers = this.headers(sheet);
    if (!headers.includes('Account ID')) {
      sheet
        .getRange(1, sheet.getLastColumn() + 1)
        .setValue('Account ID')
        .setFontWeight('bold');
    }
  }

  private headers(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
    return sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
  }
}
