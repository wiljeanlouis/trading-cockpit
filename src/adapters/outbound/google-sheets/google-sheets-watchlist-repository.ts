import {
  isActiveWatchlistStatus,
  sameWatchlistIdentity,
  watchlistIdentityOf,
  type WatchlistEntry,
  type WatchlistIdentity
} from '../../../core/domain/watchlist';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';
import { watchlistEntryFromRow, watchlistEntryToRow } from './watchlist-mapper';
import { updateWatchlistStatusInSheet } from './watchlist-status-writer';

declare function getOrCreateWatchlistSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validateWatchlistSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addWatchlistFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatWatchlistRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function themeWatchlist(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

const WATCHLIST_SHEET_NAME = 'Watchlist';

export class GoogleSheetsWatchlistRepository implements WatchlistRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private schemaValidated = false;

  findById(id: string): WatchlistEntry | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return null;
    }

    const headers = this.getHeaders(sheet);
    const idIndex = this.requireColumn(headers, 'Watchlist ID');
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalizedId = String(id || '').trim();

    for (const row of rows) {
      if (String(row[idIndex] || '').trim() === normalizedId) {
        return watchlistEntryFromRow(headers, row);
      }
    }

    return null;
  }

  findActiveByIdentity(identity: WatchlistIdentity): WatchlistEntry | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return null;
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    for (const row of rows) {
      const entry = watchlistEntryFromRow(headers, row);

      if (
        sameWatchlistIdentity(watchlistIdentityOf(entry), identity) &&
        isActiveWatchlistStatus(entry.status)
      ) {
        return entry;
      }
    }

    return null;
  }

  save(entry: WatchlistEntry): void {
    const sheet = this.getValidatedSheet();

    sheet.appendRow(watchlistEntryToRow(entry));

    const insertedRow = sheet.getLastRow();

    addWatchlistFormulas(sheet, insertedRow);
    formatWatchlistRow(sheet, insertedRow);
    themeWatchlist(SpreadsheetApp.getActiveSpreadsheet());
  }

  updateStatus(id: string, status: string): void {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WATCHLIST_SHEET_NAME);

    if (!sheet) {
      throw new Error(`${WATCHLIST_SHEET_NAME} est absent.`);
    }

    updateWatchlistStatusInSheet(sheet, id, status);
  }

  private getHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
    return sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
  }

  private requireColumn(headers: string[], name: string): number {
    const expected = name.trim().toLowerCase();
    const index = headers.findIndex((header) => header.trim().toLowerCase() === expected);

    if (index === -1) {
      throw new Error(`Colonne absente : ${name}`);
    }

    return index;
  }

  private getValidatedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreateWatchlistSheet();
    }

    if (!this.schemaValidated) {
      validateWatchlistSchema(this.sheet);
      this.schemaValidated = true;
    }

    return this.sheet;
  }
}
