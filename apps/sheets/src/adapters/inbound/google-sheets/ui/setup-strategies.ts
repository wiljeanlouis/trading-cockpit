import {
  GoogleSheetsTradingStrategyReader,
  type SheetTradingStrategy
} from '../../../outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-reader';
import type { TradingStrategyVersion } from '@trading-cockpit/core/domain/trading-strategy';
import { STRATEGY_HEADERS, STRATEGY_VERSION_HEADERS } from '@trading-cockpit/contracts';

const STRATEGIES_SHEET_NAME = 'Strategies';
const STRATEGY_VERSIONS_SHEET_NAME = 'Strategy Versions';
export const STRATEGY_TYPE_VALUES = [
  'MOMENTUM',
  'BREAKOUT',
  'MEAN_REVERSION',
  'TREND_FOLLOWING',
  'EVENT_DRIVEN',
  'OTHER'
];

export function setupStrategiesInSheets(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(STRATEGIES_SHEET_NAME) ??
    spreadsheet.insertSheet(STRATEGIES_SHEET_NAME);
  sheet.getRange(1, 1, 1, STRATEGY_HEADERS.length).setValues([[...STRATEGY_HEADERS]]);
  insertCheckboxesForExistingRows(sheet, 4);
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STRATEGY_TYPE_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('C2:C').setDataValidation(typeRule);
  sheet.setFrozenRows(1);
  [190, 180, 150, 90, 350].forEach((width, index) => sheet.setColumnWidth(index + 1, width));

  const versionsSheet =
    spreadsheet.getSheetByName(STRATEGY_VERSIONS_SHEET_NAME) ??
    spreadsheet.insertSheet(STRATEGY_VERSIONS_SHEET_NAME);
  versionsSheet
    .getRange(1, 1, 1, STRATEGY_VERSION_HEADERS.length)
    .setValues([[...STRATEGY_VERSION_HEADERS]]);
  insertCheckboxesForExistingRows(versionsSheet, 3);
  versionsSheet.setFrozenRows(1);
  [190, 90, 90, 190, 120, 640].forEach((width, index) =>
    versionsSheet.setColumnWidth(index + 1, width)
  );
  spreadsheet.toast('Strategies configuré.', 'Trading Cockpit', 5);
}

function insertCheckboxesForExistingRows(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  column: number
): void {
  const recordCount = sheet.getLastRow() - 1;
  if (recordCount <= 0) return;
  sheet.getRange(2, column, recordCount, 1).insertCheckboxes();
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

export function validateStrategyVersions(
  strategies: SheetTradingStrategy[],
  versions: TradingStrategyVersion[]
): true {
  const strategyIds = new Set(strategies.map((strategy) => strategy.id));
  const enabledStrategies = new Set(
    strategies.filter((strategy) => strategy.enabled).map((strategy) => strategy.id)
  );
  const versionKeys = new Set<string>();
  const activeVersionByStrategy = new Set<string>();
  versions.forEach((version) => {
    if (!strategyIds.has(version.strategyId))
      throw new Error(`Strategy inconnue : ${version.strategyId}`);
    const key = `${version.strategyId}|${version.version}`;
    if (versionKeys.has(key)) throw new Error(`Strategy Version dupliquée : ${key}`);
    versionKeys.add(key);
    if (!version.enabled) return;
    if (!enabledStrategies.has(version.strategyId)) {
      throw new Error(`Strategy parent désactivée : ${version.strategyId}`);
    }
    if (activeVersionByStrategy.has(version.strategyId)) {
      throw new Error(`Plusieurs versions actives pour ${version.strategyId}`);
    }
    activeVersionByStrategy.add(version.strategyId);
  });
  return true;
}

export function validateStrategiesInSheets(reader = new GoogleSheetsTradingStrategyReader()): true {
  const strategies = reader.listAll();
  validateEnabledStrategies(strategies);
  return validateStrategyVersions(strategies, reader.listVersions());
}
