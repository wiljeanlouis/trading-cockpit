import { buildSignalKey } from '../../../core/domain/market-signal';
import type { SignalSnapshot } from '../../../core/domain/market-signal';
import type { SignalHistoryRepository } from '../../../ports/outbound/signal-history-repository';

const SHEET_NAME = 'Signals History';
const REQUIRED_HEADERS = [
  'Signal Date',
  'Detected At',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker'
];

declare function themeTechnicalSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): void;

function headersOf(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((value) => String(value).trim());
}

function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => header.trim().toLowerCase() === expected);
  if (index === -1) throw new Error(`Colonne absente : ${name}`);
  return index;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }
  return String(value).trim().substring(0, 10);
}

export class GoogleSheetsSignalHistoryRepository implements SignalHistoryRepository {
  ensureReady(attributeNames: string[]): void {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    if (this.isEmpty(sheet)) {
      const headers = [...REQUIRED_HEADERS, ...attributeNames];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      themeTechnicalSheet(spreadsheet, SHEET_NAME);
      return;
    }
    const headers = headersOf(sheet);
    REQUIRED_HEADERS.forEach((header) => {
      if (!headers.includes(header)) {
        throw new Error(`Signals History utilise un ancien schéma. Colonne absente : ${header}`);
      }
    });
  }

  loadExistingKeys(): Set<string> {
    const sheet = this.sheet();
    const keys = new Set<string>();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return keys;
    const headers = headersOf(sheet);
    const signalDateIndex = requireColumn(headers, 'Signal Date');
    const strategyIdIndex = requireColumn(headers, 'Strategy ID');
    const versionIndex = requireColumn(headers, 'Strategy Version');
    const tickerIndex = requireColumn(headers, 'Ticker');
    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    values.forEach((row) => {
      const date = formatDate(row[signalDateIndex]);
      const strategyId = String(row[strategyIdIndex] || '')
        .trim()
        .toUpperCase();
      const version = String(row[versionIndex] || '').trim();
      const ticker = String(row[tickerIndex] || '')
        .trim()
        .toUpperCase();
      if (!date || !strategyId || !ticker) return;
      keys.add(buildSignalKey(date, strategyId, version, ticker));
    });
    return keys;
  }

  append(snapshots: SignalSnapshot[]): void {
    if (snapshots.length === 0) return;
    const rows = snapshots.map((snapshot) => [
      snapshot.signalDate,
      snapshot.detectedAt,
      snapshot.strategyId,
      snapshot.strategyName,
      snapshot.strategyVersion,
      snapshot.ticker,
      ...Object.values(snapshot.attributes)
    ]);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = this.sheet();
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(startRow, 2, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    themeTechnicalSheet(spreadsheet, SHEET_NAME);
  }

  private sheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Feuille absente : ${SHEET_NAME}`);
    return sheet;
  }

  private isEmpty(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
    if (sheet.getLastRow() === 0) return true;
    if (sheet.getLastRow() > 1) return false;
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) return true;
    return sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .every((value) => !String(value || '').trim());
  }
}
