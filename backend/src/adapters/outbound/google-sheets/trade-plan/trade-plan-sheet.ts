import { TRADE_PLAN_HEADERS } from './trade-plan-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { themeTradePlans } from '../../../inbound/google-sheets/theme/theme';
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
  themeTradePlans(spreadsheet);
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
    [requireColumn(headers, 'Entry Type') + 1, ['BREAKOUT', 'RETEST', 'LIMIT']],
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
  sheet.getRange(row, 20).setFormula(`=IF(OR(Q${row}="",R${row}=""),"",Q${row}-R${row})`);
  sheet.getRange(row, 21).setFormula(`=IF(OR(Q${row}="",S${row}=""),"",S${row}-Q${row})`);
  sheet
    .getRange(row, 22)
    .setFormula(`=IF(OR(T${row}="",T${row}<=0,U${row}=""),"",U${row}/T${row})`);
  sheet.getRange(row, 25).setFormula(`=IF(OR(W${row}="",X${row}=""),"",W${row}*X${row})`);
  sheet
    .getRange(row, 26)
    .setFormula(`=IF(OR(Y${row}="",T${row}="",T${row}<=0),"",FLOOR(Y${row}/T${row},1))`);
  sheet.getRange(row, 27).setFormula(`=IF(OR(Z${row}="",Q${row}=""),"",Z${row}*Q${row})`);
}

export function formatTradePlanRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 6).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 7).setNumberFormat('$0.00');
  sheet.getRange(row, 9).setNumberFormat('$0.00');
  sheet.getRange(row, 12, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 15).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 17, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 20, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 22).setNumberFormat('0.00');
  sheet.getRange(row, 23).setNumberFormat('$#,##0.00');
  sheet.getRange(row, 24).setNumberFormat('0.00%');
  sheet.getRange(row, 25).setNumberFormat('$0.00');
  sheet.getRange(row, 26).setNumberFormat('0');
  sheet.getRange(row, 27).setNumberFormat('$#,##0.00');
}
