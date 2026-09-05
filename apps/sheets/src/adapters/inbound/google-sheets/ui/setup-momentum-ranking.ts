import {
  MOMENTUM_RANKING_HEADERS,
  MOMENTUM_RANKING_SHEET_NAME
} from '../../../outbound/google-sheets/momentum/momentum-ranking-schema';
import { DATA_SHEET_HEADER_ROW } from '../../../outbound/google-sheets/data-sheet';

export const MOMENTUM_RANKING_SETUP_HEADERS = MOMENTUM_RANKING_HEADERS;

export function createMomentumRankingInSheets(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(MOMENTUM_RANKING_SHEET_NAME) ??
    spreadsheet.insertSheet(MOMENTUM_RANKING_SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(DATA_SHEET_HEADER_ROW, 1, 1, MOMENTUM_RANKING_SETUP_HEADERS.length)
    .setValues([[...MOMENTUM_RANKING_SETUP_HEADERS]])
    .setFontWeight('bold');
  sheet.setFrozenRows(DATA_SHEET_HEADER_ROW);
  sheet.autoResizeColumns(1, MOMENTUM_RANKING_SETUP_HEADERS.length);
}

export function setupMomentumRankingInSheets(): void {
  createMomentumRankingInSheets();
  SpreadsheetApp.getActiveSpreadsheet().toast('Momentum Ranking configuré.', 'Trading Cockpit', 5);
}
