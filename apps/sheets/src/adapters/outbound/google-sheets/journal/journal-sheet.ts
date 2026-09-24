import { JOURNAL_HEADERS } from './journal-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { initializeCanonicalTableSheet, isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Journal';

export function getOrCreateJournalSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing && !isSheetEffectivelyEmpty(existing)) return existing;
  const sheet = initializeCanonicalTableSheet(SHEET_NAME, JOURNAL_HEADERS);
  refreshJournalValidations(sheet);
  return sheet;
}

export function validateJournalSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  return validateJournalHeaders(readSheetHeaders(sheet));
}

export function validateJournalHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, JOURNAL_HEADERS, 'Journal');
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
  sheet.getRange(row, 19).setFormula(`=IF(OR(K${row}="",L${row}=""),"",L${row}/K${row}-1)`);
  sheet
    .getRange(row, 20)
    .setFormula(`=IF(OR(P${row}="",P${row}<=0,R${row}=""),"",R${row}/P${row})`);
  sheet
    .getRange(row, 21)
    .setFormula(`=IF(R${row}="","",IF(R${row}>0,"WIN",IF(R${row}<0,"LOSS","BREAKEVEN")))`);
}

export function formatJournalRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 8, 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 10, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 13).setNumberFormat('0');
  sheet.getRange(row, 14, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 16).setNumberFormat('$0.00');
  sheet.getRange(row, 17).setNumberFormat('0.00');
  sheet.getRange(row, 18).setNumberFormat('$0.00');
  sheet.getRange(row, 19).setNumberFormat('0.00%');
  sheet.getRange(row, 20).setNumberFormat('0.00');
}
