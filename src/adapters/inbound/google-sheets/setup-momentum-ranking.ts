const MOMENTUM_SCORE_CONFIG_SHEET_NAME = 'Momentum Score Config';
const MOMENTUM_RANKING_SHEET_NAME = 'Momentum Ranking';

export const MOMENTUM_SCORE_CONFIG_VALUES: (string | number)[][] = [
  ['MOMENTUM BREAKOUT SCORE V1', '', '', ''],
  ['', '', '', ''],
  ['Component', 'Condition', 'Points', 'Max'],
  ['52W High', '0% à -1%', 25, 25],
  ['52W High', '-1% à -2%', 22, ''],
  ['52W High', '-2% à -3%', 18, ''],
  ['52W High', '-3% à -4%', 14, ''],
  ['52W High', '-4% à -5%', 10, ''],
  ['', '', '', ''],
  ['Relative Volume', '>= 2.0', 25, 25],
  ['Relative Volume', '1.5 à 1.99', 20, ''],
  ['Relative Volume', '1.25 à 1.49', 15, ''],
  ['Relative Volume', '1.0 à 1.24', 10, ''],
  ['', '', '', ''],
  ['Performance Month', '>= 20%', 20, 20],
  ['Performance Month', '15% à 19.99%', 17, ''],
  ['Performance Month', '10% à 14.99%', 14, ''],
  ['Performance Month', '5% à 9.99%', 10, ''],
  ['Performance Month', '0% à 4.99%', 5, ''],
  ['', '', '', ''],
  ['RSI', '60 à 67', 15, 15],
  ['RSI', '55 à 59.99', 12, ''],
  ['RSI', '67.01 à 70', 10, ''],
  ['RSI', '50 à 54.99', 7, ''],
  ['', '', '', ''],
  ['SMA20 Extension', '2% à 8%', 15, 15],
  ['SMA20 Extension', '0% à 2%', 10, ''],
  ['SMA20 Extension', '8% à 12%', 10, ''],
  ['SMA20 Extension', '> 12%', 5, '']
];

// Preserve the legacy setup schema. The refresh projection intentionally replaces it with 21 columns.
export const MOMENTUM_RANKING_SETUP_HEADERS = [
  'Rank',
  'Ticker',
  'Company',
  'Sector',
  'Price',
  '52W High',
  '52W Score',
  'Relative Volume',
  'RelVol Score',
  'Performance Month',
  'Performance Score',
  'RSI',
  'RSI Score',
  'SMA20',
  'SMA20 Score',
  'Momentum Score',
  'Review Status'
];

export function createMomentumScoreConfigInSheets(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(MOMENTUM_SCORE_CONFIG_SHEET_NAME) ??
    spreadsheet.insertSheet(MOMENTUM_SCORE_CONFIG_SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, MOMENTUM_SCORE_CONFIG_VALUES.length, 4)
    .setValues(MOMENTUM_SCORE_CONFIG_VALUES);
  sheet.getRange('A1:D1').merge().setFontWeight('bold').setFontSize(14);
  sheet.getRange('A3:D3').setFontWeight('bold');
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, 4);
}

export function createMomentumRankingInSheets(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(MOMENTUM_RANKING_SHEET_NAME) ??
    spreadsheet.insertSheet(MOMENTUM_RANKING_SHEET_NAME);
  sheet.clear();
  sheet
    .getRange('A1')
    .setValue('MOMENTUM BREAKOUT RANKING V1')
    .setFontWeight('bold')
    .setFontSize(14);
  sheet.getRange('A3').setValue('Score de priorisation seulement — pas un signal d’achat.');
  sheet
    .getRange(5, 1, 1, MOMENTUM_RANKING_SETUP_HEADERS.length)
    .setValues([MOMENTUM_RANKING_SETUP_HEADERS])
    .setFontWeight('bold');
  sheet.setFrozenRows(5);
  sheet.autoResizeColumns(1, MOMENTUM_RANKING_SETUP_HEADERS.length);
}

export function setupMomentumRankingInSheets(): void {
  createMomentumScoreConfigInSheets();
  createMomentumRankingInSheets();
  SpreadsheetApp.getActiveSpreadsheet().toast('Momentum Ranking configuré.', 'Trading Cockpit', 5);
}
