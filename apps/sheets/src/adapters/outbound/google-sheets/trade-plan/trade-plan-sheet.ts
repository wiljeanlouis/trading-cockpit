import { TRADE_PLAN_HEADERS } from './trade-plan-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { initializeCanonicalTableSheet, isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Trade Plans';

export function getOrCreateTradePlansSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet && !isSheetEffectivelyEmpty(sheet)) return sheet;
  sheet = initializeCanonicalTableSheet(SHEET_NAME, TRADE_PLAN_HEADERS);
  refreshTradePlanValidations(sheet);
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
  sheet.getRange(row, 18).setFormula(`=IF(OR(O${row}="",P${row}=""),"",O${row}-P${row})`);
  sheet.getRange(row, 19).setFormula(`=IF(OR(O${row}="",Q${row}=""),"",Q${row}-O${row})`);
  sheet
    .getRange(row, 20)
    .setFormula(`=IF(OR(R${row}="",R${row}<=0,S${row}=""),"",S${row}/R${row})`);
  sheet.getRange(row, 23).setFormula(`=IF(OR(U${row}="",V${row}=""),"",U${row}*V${row})`);
  sheet
    .getRange(row, 24)
    .setFormula(`=IF(OR(W${row}="",R${row}="",R${row}<=0),"",FLOOR(W${row}/R${row},1))`);
  sheet.getRange(row, 25).setFormula(`=IF(OR(X${row}="",O${row}=""),"",X${row}*O${row})`);
}

export function formatTradePlanRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 5).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 6).setNumberFormat('$0.00');
  sheet.getRange(row, 8).setNumberFormat('$0.00');
  sheet.getRange(row, 10, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 13).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 15, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 18, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 20).setNumberFormat('0.00');
  sheet.getRange(row, 21).setNumberFormat('$#,##0.00');
  sheet.getRange(row, 22).setNumberFormat('0.00%');
  sheet.getRange(row, 23).setNumberFormat('$0.00');
  sheet.getRange(row, 24).setNumberFormat('0');
  sheet.getRange(row, 25).setNumberFormat('$#,##0.00');
}
