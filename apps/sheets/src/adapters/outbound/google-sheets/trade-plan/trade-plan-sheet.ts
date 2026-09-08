import { TRADE_PLAN_HEADERS } from './trade-plan-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Trade Plans';

export function getOrCreateTradePlansSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet && !isSheetEffectivelyEmpty(sheet)) return sheet;
  sheet = sheet ?? spreadsheet.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, 1, TRADE_PLAN_HEADERS.length)
    .setValues([[...TRADE_PLAN_HEADERS]])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  refreshTradePlanValidations(sheet);
  sheet.autoResizeColumns(1, TRADE_PLAN_HEADERS.length);
  return sheet;
}

export function validateTradePlansSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): true {
  return validateTradePlansHeaders(readSheetHeaders(sheet));
}

export function validateTradePlansHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, TRADE_PLAN_HEADERS, 'Trade Plans');
}

export function refreshTradePlanValidations(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headers = readSheetHeaders(sheet);
  const definitions = [
    [requireColumn(headers, 'Entry Type') + 1, ['TRIGGER', 'RETEST', 'LIMIT']],
    [requireColumn(headers, 'Status') + 1, ['DRAFT', 'READY', 'EXECUTED', 'CANCELLED']]
  ] as const;
  definitions.forEach(([column, values]) => {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([...values], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  });
}

export function addTradePlanFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 19).setFormula(`=IF(OR(P${row}="",Q${row}=""),"",P${row}-Q${row})`);
  sheet.getRange(row, 20).setFormula(`=IF(OR(P${row}="",R${row}=""),"",R${row}-P${row})`);
  sheet
    .getRange(row, 21)
    .setFormula(`=IF(OR(S${row}="",S${row}<=0,T${row}=""),"",T${row}/S${row})`);
  sheet.getRange(row, 24).setFormula(`=IF(OR(V${row}="",W${row}=""),"",V${row}*W${row})`);
  sheet
    .getRange(row, 25)
    .setFormula(`=IF(OR(X${row}="",S${row}="",S${row}<=0),"",FLOOR(X${row}/S${row},1))`);
  sheet.getRange(row, 26).setFormula(`=IF(OR(Y${row}="",P${row}=""),"",Y${row}*P${row})`);
}

export function formatTradePlanRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 6).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 7).setNumberFormat('$0.00');
  sheet.getRange(row, 9).setNumberFormat('$0.00');
  sheet.getRange(row, 11, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 14).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 16, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 19, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 21).setNumberFormat('0.00');
  sheet.getRange(row, 22).setNumberFormat('$#,##0.00');
  sheet.getRange(row, 23).setNumberFormat('0.00%');
  sheet.getRange(row, 24).setNumberFormat('$0.00');
  sheet.getRange(row, 25).setNumberFormat('0');
  sheet.getRange(row, 26).setNumberFormat('$#,##0.00');
}
