import type { WatchlistEntry } from '../../../../core/domain/watchlist';
import type { WatchlistReader } from '../../../../ports/outbound/watchlist-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetHeaders } from '../sheet-headers';
import { watchlistEntryFromRow } from './watchlist-mapper';
import { validateWatchlistSchema } from './watchlist-sheet';

const WATCHLIST_SHEET_NAME = 'Watchlist';

export class GoogleSheetsWatchlistReader implements WatchlistReader {
  findAll(): WatchlistEntry[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(WATCHLIST_SHEET_NAME);
    if (!sheet) {
      throw new Error(`${WATCHLIST_SHEET_NAME} est absente.`);
    }

    validateWatchlistSchema(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const headers = readSheetHeaders(sheet);
    return sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => watchlistEntryFromRow(headers, row))
      .filter((entry) => Boolean(entry.id));
  }
}
