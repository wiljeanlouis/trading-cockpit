import {
  isActiveWatchlistStatus,
  sameWatchlistIdentity,
  watchlistIdentityOf,
  type WatchlistEntry,
  type WatchlistIdentity
} from '../../../core/domain/watchlist';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';
import { watchlistEntryFromRow, watchlistEntryToRow } from './watchlist-mapper';

declare function getOrCreateWatchlistSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validateWatchlistSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addWatchlistFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatWatchlistRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function themeWatchlist(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export class GoogleSheetsWatchlistRepository implements WatchlistRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private schemaValidated = false;

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
