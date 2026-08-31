import {
  MOMENTUM_RANKING_HEADERS,
  MOMENTUM_RANKING_SHEET_NAME
} from '../../../outbound/google-sheets/momentum/momentum-ranking-schema';
import { DATA_SHEET_HEADER_ROW } from '../../../outbound/google-sheets/data-sheet';

const MOMENTUM_SCORE_CONFIG_SHEET_NAME = 'Momentum Score Config';

export const MOMENTUM_SCORE_CONFIG_HEADERS = ['Component', 'Condition', 'Points', 'Max'] as const;

export const MOMENTUM_SCORE_CONFIG_VALUES: (string | number)[][] = [
  ['52W High', '0% à -1%', 25, 25],
  ['52W High', '-1% à -2%', 22, ''],
  ['52W High', '-2% à -3%', 18, ''],
  ['52W High', '-3% à -4%', 14, ''],
  ['52W High', '-4% à -5%', 10, ''],
  ['Relative Volume', '>= 2.0', 25, 25],
  ['Relative Volume', '1.5 à 1.99', 20, ''],
  ['Relative Volume', '1.25 à 1.49', 15, ''],
  ['Relative Volume', '1.0 à 1.24', 10, ''],
  ['Performance Month', '>= 20%', 20, 20],
  ['Performance Month', '15% à 19.99%', 17, ''],
  ['Performance Month', '10% à 14.99%', 14, ''],
  ['Performance Month', '5% à 9.99%', 10, ''],
  ['Performance Month', '0% à 4.99%', 5, ''],
  ['RSI', '60 à 67', 15, 15],
  ['RSI', '55 à 59.99', 12, ''],
  ['RSI', '67.01 à 70', 10, ''],
  ['RSI', '50 à 54.99', 7, ''],
  ['SMA20 Extension', '2% à 8%', 15, 15],
  ['SMA20 Extension', '0% à 2%', 10, ''],
  ['SMA20 Extension', '8% à 12%', 10, ''],
  ['SMA20 Extension', '> 12%', 5, '']
];

export const MOMENTUM_RANKING_SETUP_HEADERS = MOMENTUM_RANKING_HEADERS;

export function createMomentumScoreConfigInSheets(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(MOMENTUM_SCORE_CONFIG_SHEET_NAME) ??
    spreadsheet.insertSheet(MOMENTUM_SCORE_CONFIG_SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, 1, 4)
    .setValues([[...MOMENTUM_SCORE_CONFIG_HEADERS]])
    .setFontWeight('bold');
  sheet
    .getRange(2, 1, MOMENTUM_SCORE_CONFIG_VALUES.length, 4)
    .setValues(MOMENTUM_SCORE_CONFIG_VALUES);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);
}

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
  createMomentumScoreConfigInSheets();
  createMomentumRankingInSheets();
  SpreadsheetApp.getActiveSpreadsheet().toast('Momentum Ranking configuré.', 'Trading Cockpit', 5);
}
