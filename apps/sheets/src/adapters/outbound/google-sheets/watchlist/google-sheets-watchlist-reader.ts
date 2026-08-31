import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';
import type { WatchlistReader } from '@trading-cockpit/core/ports/outbound/watchlist-reader';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable } from '../sheet-headers';
import { watchlistEntryFromRow } from './watchlist-mapper';
import { validateWatchlistHeaders } from './watchlist-sheet';

const WATCHLIST_SHEET_NAME = 'Watchlist';

export class GoogleSheetsWatchlistReader implements WatchlistReader {
  findAll(): WatchlistEntry[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(WATCHLIST_SHEET_NAME);
    if (!sheet) {
      throw new Error(`${WATCHLIST_SHEET_NAME} est absente.`);
    }

    const { headers, rows } = readSheetTable(sheet);
    validateWatchlistHeaders(headers);
    return rows
      .map((row) => watchlistEntryFromRow(headers, row))
      .filter((entry) => Boolean(entry.id));
  }
}
