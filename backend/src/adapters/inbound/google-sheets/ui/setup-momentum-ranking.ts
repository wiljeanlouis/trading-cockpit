import {
  LEGACY_MOMENTUM_RANKING_HEADER_ROW,
  MOMENTUM_RANKING_HEADERS,
  MOMENTUM_RANKING_SHEET_NAME
} from '../../../outbound/google-sheets/momentum/momentum-ranking-schema';
import { DATA_SHEET_HEADER_ROW } from '../../../outbound/google-sheets/data-sheet';

const MOMENTUM_SCORE_CONFIG_SHEET_NAME = 'Momentum Score Config';

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

export const MOMENTUM_RANKING_SETUP_HEADERS = MOMENTUM_RANKING_HEADERS;

export interface MomentumRankingMigrationResult {
  status: 'ALREADY_NORMALIZED' | 'MIGRATED' | 'CREATED_EMPTY' | 'REFUSED_UNEXPECTED_LAYOUT';
  preservedRecords: number;
  message: string;
}

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

export function migrateMomentumRankingToDataSheet(): MomentumRankingMigrationResult {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(MOMENTUM_RANKING_SHEET_NAME) ??
    spreadsheet.insertSheet(MOMENTUM_RANKING_SHEET_NAME);
  const result = migrateMomentumRankingSheet(sheet);
  spreadsheet.toast(result.message, 'Trading Cockpit', 7);
  return result;
}

export function migrateMomentumRankingSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): MomentumRankingMigrationResult {
  const lastColumn = Math.max(sheet.getLastColumn(), MOMENTUM_RANKING_HEADERS.length);
  const lastRow = sheet.getLastRow();
  const row1 = readRow(sheet, 1, lastColumn);
  if (hasExactHeaders(row1, MOMENTUM_RANKING_HEADERS)) {
    return {
      status: 'ALREADY_NORMALIZED',
      preservedRecords: Math.max(lastRow - 1, 0),
      message: 'Momentum Ranking est déjà normalisé.'
    };
  }

  if (isEffectivelyEmpty(sheet, lastRow, lastColumn)) {
    writeNormalizedRanking(sheet, []);
    return {
      status: 'CREATED_EMPTY',
      preservedRecords: 0,
      message: 'Momentum Ranking normalisé avec un tableau vide.'
    };
  }

  if (lastRow < LEGACY_MOMENTUM_RANKING_HEADER_ROW) {
    return refused();
  }

  const legacyHeaders = readRow(sheet, LEGACY_MOMENTUM_RANKING_HEADER_ROW, lastColumn);
  if (!hasExactHeaders(legacyHeaders, MOMENTUM_RANKING_HEADERS)) {
    return refused();
  }

  if (!hasOnlyKnownLegacyMetadata(sheet, lastColumn)) {
    return refused();
  }

  const rows =
    lastRow <= LEGACY_MOMENTUM_RANKING_HEADER_ROW
      ? []
      : sheet
          .getRange(
            LEGACY_MOMENTUM_RANKING_HEADER_ROW + 1,
            1,
            lastRow - LEGACY_MOMENTUM_RANKING_HEADER_ROW,
            lastColumn
          )
          .getValues()
          .filter((row) => row.some((value) => String(value || '').trim()));
  writeNormalizedRanking(sheet, rows);
  return {
    status: 'MIGRATED',
    preservedRecords: rows.length,
    message: `Momentum Ranking normalisé. ${rows.length} record(s) préservé(s).`
  };
}

function writeNormalizedRanking(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rows: unknown[][]
): void {
  sheet.clear();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  sheet
    .getRange(1, 1, 1, MOMENTUM_RANKING_HEADERS.length)
    .setValues([[...MOMENTUM_RANKING_HEADERS]])
    .setFontWeight('bold');
  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, MOMENTUM_RANKING_HEADERS.length)
      .setValues(
        rows.map((row) =>
          [...row, ...Array(MOMENTUM_RANKING_HEADERS.length)].slice(
            0,
            MOMENTUM_RANKING_HEADERS.length
          )
        )
      );
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, MOMENTUM_RANKING_HEADERS.length);
}

function readRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  columns: number
): string[] {
  return sheet
    .getRange(row, 1, 1, columns)
    .getValues()[0]
    .map((value) => String(value || '').trim());
}

function hasExactHeaders(row: readonly string[], headers: readonly string[]): boolean {
  return headers.every((header, index) => row[index] === header);
}

function isEffectivelyEmpty(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  lastRow: number,
  lastColumn: number
): boolean {
  if (lastRow === 0 || lastColumn === 0) return true;
  return sheet
    .getRange(1, 1, Math.max(lastRow, 1), Math.max(lastColumn, 1))
    .getValues()
    .every((row) => row.every((value) => !String(value || '').trim()));
}

function hasOnlyKnownLegacyMetadata(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  columns: number
): boolean {
  const rows = sheet.getRange(1, 1, 4, columns).getValues();
  return rows.every((row, index) => {
    const text = row
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
    if (!text) return true;
    if (index === 0) return text.includes('RANKING');
    if (index === 1) return text.startsWith('Signal Date:');
    if (index === 2) return text.includes('Score de priorisation');
    return false;
  });
}

function refused(): MomentumRankingMigrationResult {
  return {
    status: 'REFUSED_UNEXPECTED_LAYOUT',
    preservedRecords: 0,
    message:
      'Momentum Ranking possède un layout inattendu. Migration refusée pour éviter de perdre des données.'
  };
}
