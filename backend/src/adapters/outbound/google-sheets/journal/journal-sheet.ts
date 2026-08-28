import { JOURNAL_HEADERS } from './journal-mapper';
import { readSheetHeaders, requireColumn } from '../sheet-headers';

const SHEET_NAME = 'Journal';
const HISTORICAL_HEADERS = JOURNAL_HEADERS.slice(0, -1);

declare function themeJournal(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export function getOrCreateJournalSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing) return existing;
  const sheet = spreadsheet.insertSheet(SHEET_NAME);
  sheet
    .getRange(1, 1, 1, HISTORICAL_HEADERS.length)
    .setValues([Array.from(HISTORICAL_HEADERS)])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  refreshJournalValidations(sheet);
  sheet.autoResizeColumns(1, HISTORICAL_HEADERS.length);
  themeJournal(spreadsheet);
  return sheet;
}

export function validateJournalSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  const headers = readSheetHeaders(sheet);
  for (const header of HISTORICAL_HEADERS) {
    if (!headers.includes(header)) {
      throw new Error(`Journal utilise un ancien schéma. Colonne absente : ${header}`);
    }
  }
  return true;
}

export function ensureJournalAccountColumn(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headers = readSheetHeaders(sheet);
  if (!headers.includes('Account ID')) {
    sheet
      .getRange(1, sheet.getLastColumn() + 1)
      .setValue('Account ID')
      .setFontWeight('bold');
  }
}

export function refreshJournalValidations(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headers = readSheetHeaders(sheet);
  const exitReasonColumn = requireColumn(headers, 'Exit Reason') + 1;
  const followedPlanColumn = requireColumn(headers, 'Followed Plan?') + 1;
  const exitReasonRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
      ['TARGET', 'STOP', 'TRAILING STOP', 'MANUAL', 'SETUP INVALIDATED', 'TIME EXIT', 'OTHER'],
      true
    )
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, exitReasonColumn, sheet.getMaxRows() - 1, 1).setDataValidation(exitReasonRule);
  const followedPlanRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['YES', 'PARTIALLY', 'NO'], true)
    .setAllowInvalid(true)
    .build();
  sheet
    .getRange(2, followedPlanColumn, sheet.getMaxRows() - 1, 1)
    .setDataValidation(followedPlanRule);
}

export function addJournalFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 20).setFormula(`=IF(OR(L${row}="",M${row}=""),"",M${row}/L${row}-1)`);
  sheet
    .getRange(row, 21)
    .setFormula(`=IF(OR(Q${row}="",Q${row}<=0,S${row}=""),"",S${row}/Q${row})`);
  sheet
    .getRange(row, 22)
    .setFormula(`=IF(S${row}="","",IF(S${row}>0,"WIN",IF(S${row}<0,"LOSS","BREAKEVEN")))`);
}

export function formatJournalRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 9, 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 11, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 14).setNumberFormat('0');
  sheet.getRange(row, 15, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 17).setNumberFormat('$0.00');
  sheet.getRange(row, 18).setNumberFormat('0.00');
  sheet.getRange(row, 19).setNumberFormat('$0.00');
  sheet.getRange(row, 20).setNumberFormat('0.00%');
  sheet.getRange(row, 21).setNumberFormat('0.00');
}
