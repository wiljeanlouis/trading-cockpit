import { initializeCanonicalTableSheet } from '../data-sheet';
import { readSheetHeaders, requireSheetHeaders } from '../sheet-headers';
import { TRADING_ACCOUNT_HEADERS } from './trading-account-mapper';

const ACCOUNTS_SHEET_NAME = 'Accounts';

export function getOrCreateTradingAccountsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = initializeCanonicalTableSheet(ACCOUNTS_SHEET_NAME, TRADING_ACCOUNT_HEADERS);
  refreshAccountRiskValidation(sheet);
  return sheet;
}

export function validateTradingAccountHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, TRADING_ACCOUNT_HEADERS, ACCOUNTS_SHEET_NAME);
}

export function refreshAccountRiskValidation(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headers = readSheetHeaders(sheet).map((value) => String(value || '').trim());
  requireSheetHeaders(headers, TRADING_ACCOUNT_HEADERS, ACCOUNTS_SHEET_NAME);
  const riskColumn = headers.indexOf('Risk % Per Trade') + 1;
  const dataRows = Math.max(sheet.getMaxRows() - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(Number.MIN_VALUE, 1)
    .setAllowInvalid(false)
    .setHelpText('Risk % Per Trade doit être supérieur à 0 et inférieur ou égal à 100%.')
    .build();

  sheet.getRange(2, riskColumn, dataRows, 1).setDataValidation(rule).setNumberFormat('0.00%');
}
