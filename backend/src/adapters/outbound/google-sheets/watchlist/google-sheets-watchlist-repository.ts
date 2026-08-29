import {
  isActiveWatchlistStatus,
  sameWatchlistIdentity,
  watchlistIdentityOf,
  type WatchlistEntry,
  type WatchlistIdentity
} from '../../../../core/domain/watchlist';
import type { WatchlistRepository } from '../../../../ports/outbound/watchlist-repository';
import { watchlistEntryFromRow, watchlistEntryToRow } from './watchlist-mapper';
import { updateWatchlistStatusInSheet } from './watchlist-status-writer';
import {
  addWatchlistFormulas,
  formatWatchlistRow,
  getOrCreateWatchlistSheet,
  validateWatchlistSchema
} from './watchlist-sheet';
import { readSheetHeaders, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
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

    const headers = readSheetHeaders(sheet);
    const idIndex = requireColumn(headers, 'Watchlist ID');
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

    const headers = readSheetHeaders(sheet);
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
    themeWatchlist(getTradingCockpitSpreadsheet());
  }

  updateTradePlanningInputs(
    id: string,
    inputs: { breakoutLevel: number | null; invalidationLevel: number; eventRisk: string }
  ): void {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();
    const headers = readSheetHeaders(sheet);
    const idColumn = requireColumn(headers, 'Watchlist ID') + 1;
    const normalizedId = String(id || '').trim();

    if (lastRow <= 1) throw new Error(`Watchlist ID introuvable : ${normalizedId}`);

    const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
    const offset = ids.findIndex(([value]) => String(value || '').trim() === normalizedId);
    if (offset < 0) throw new Error(`Watchlist ID introuvable : ${normalizedId}`);

    const row = offset + 2;
    sheet
      .getRange(row, requireColumn(headers, 'Breakout Level') + 1)
      .setValue(inputs.breakoutLevel ?? '');
    sheet
      .getRange(row, requireColumn(headers, 'Invalidation Level') + 1)
      .setValue(inputs.invalidationLevel);
    sheet.getRange(row, requireColumn(headers, 'Event Risk') + 1).setValue(inputs.eventRisk);
  }

  updateStatus(id: string, status: string): void {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(WATCHLIST_SHEET_NAME);

    if (!sheet) {
      throw new Error(`${WATCHLIST_SHEET_NAME} est absent.`);
    }

    updateWatchlistStatusInSheet(sheet, id, status);
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
