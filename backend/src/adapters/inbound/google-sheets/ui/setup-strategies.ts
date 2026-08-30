import {
  GoogleSheetsTradingStrategyReader,
  type SheetTradingStrategy
} from '../../../outbound/google-sheets/trading-strategy/google-sheets-trading-strategy-reader';
import { themeSimpleSheet } from '../theme/theme';

const STRATEGIES_SHEET_NAME = 'Strategies';
export const STRATEGY_HEADERS = [
  'Strategy ID',
  'Name',
  'Version',
  'Type',
  'Enabled',
  'Risk %',
  'Max Positions',
  'Description'
];
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
  sheet.getRange(1, 1, 1, STRATEGY_HEADERS.length).setValues([STRATEGY_HEADERS]);
  if (sheet.getLastRow() === 1) {
    sheet
      .getRange(2, 1, 1, STRATEGY_HEADERS.length)
      .setValues([
        [
          'MOMENTUM_BREAKOUT',
          'Momentum Breakout',
          'V1',
          'MOMENTUM',
          true,
          0.005,
          5,
          'Momentum breakout near 52-week high'
        ]
      ]);
  }
  sheet.getRange('F2:F').setNumberFormat('0.00%');
  sheet.getRange('E2:E').insertCheckboxes();
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STRATEGY_TYPE_VALUES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D2:D').setDataValidation(typeRule);
  sheet.setFrozenRows(1);
  [190, 180, 90, 150, 90, 100, 120, 350].forEach((width, index) =>
    sheet.setColumnWidth(index + 1, width)
  );
  themeSimpleSheet(spreadsheet, STRATEGIES_SHEET_NAME);
  spreadsheet.toast('Strategies configuré.', 'Trading Cockpit', 5);
}

export function validateEnabledStrategies(strategies: SheetTradingStrategy[]): true {
  if (strategies.length === 0) throw new Error('Au moins une stratégie doit être active.');
  const ids = new Set<string>();
  strategies.forEach((strategy) => {
    if (!strategy.id) throw new Error('Strategy ID obligatoire.');
    if (ids.has(strategy.id)) throw new Error(`Strategy ID dupliqué : ${strategy.id}`);
    ids.add(strategy.id);
    if (strategy.riskPercent <= 0 || strategy.riskPercent > 0.05) {
      throw new Error(`Risk % invalide pour ${strategy.id}`);
    }
    if (strategy.maxPositions < 1) {
      throw new Error(`Max Positions invalide pour ${strategy.id}`);
    }
  });
  return true;
}

export function validateStrategiesInSheets(reader = new GoogleSheetsTradingStrategyReader()): true {
  return validateEnabledStrategies(reader.listEnabled());
}
