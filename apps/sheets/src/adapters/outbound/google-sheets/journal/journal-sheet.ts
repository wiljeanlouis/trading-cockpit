import { JOURNAL_HEADERS } from './journal-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { themeJournal } from '../../../inbound/google-sheets/theme/theme';
import { isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Journal';

export function getOrCreateJournalSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing && !isSheetEffectivelyEmpty(existing)) return existing;
  const sheet = existing ?? spreadsheet.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, 1, JOURNAL_HEADERS.length)
    .setValues([Array.from(JOURNAL_HEADERS)])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  refreshJournalValidations(sheet);
  sheet.autoResizeColumns(1, JOURNAL_HEADERS.length);
  themeJournal(spreadsheet);
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
