import { STRATEGY_HEADERS } from '@trading-cockpit/contracts';
import { readSheetHeaders, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { GoogleSheetsTradingStrategyReader } from './google-sheets-trading-strategy-reader';
import type { SheetTradingStrategy } from './trading-strategy-mapper';

const STRATEGIES_SHEET_NAME = 'Strategies';
export const STRATEGY_TYPE_VALUES = [
  'MOMENTUM',
  'BREAKOUT',
  'MEAN_REVERSION',
  'TREND_FOLLOWING',
  'EVENT_DRIVEN',
  'OTHER'
];

export function getOrCreateStrategiesSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(STRATEGIES_SHEET_NAME) ??
    spreadsheet.insertSheet(STRATEGIES_SHEET_NAME);
  sheet.getRange(1, 1, 1, STRATEGY_HEADERS.length).setValues([[...STRATEGY_HEADERS]]);
  refreshStrategyValidations(sheet);
  sheet.setFrozenRows(1);
  [190, 180, 150, 90, 350].forEach((width, index) => sheet.setColumnWidth(index + 1, width));
  return sheet;
}

export function setupStrategiesInSheets(): void {
  getOrCreateStrategiesSheet();
  getTradingCockpitSpreadsheet().toast('Strategies configuré.', 'Trading Cockpit', 5);
}

export function validateStrategiesHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, STRATEGY_HEADERS, STRATEGIES_SHEET_NAME);
}

export function validateStrategiesSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): true {
  return validateStrategiesHeaders(readSheetHeaders(sheet));
}

export function refreshStrategyValidations(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STRATEGY_TYPE_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('C2:C').setDataValidation(typeRule);
}

export function validateEnabledStrategies(strategies: SheetTradingStrategy[]): true {
  const ids = new Set<string>();
  strategies.forEach((strategy) => {
    if (!strategy.id) throw new Error('Strategy ID obligatoire.');
    const id = strategy.id.trim().toUpperCase();
    if (ids.has(id)) throw new Error(`Strategy ID dupliqué : ${id}`);
    ids.add(id);
  });
  return true;
}

export function validateStrategiesInSheets(reader = new GoogleSheetsTradingStrategyReader()): true {
  const strategies = reader.listAll();
  return validateEnabledStrategies(strategies);
}
