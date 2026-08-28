import { readSheetHeaders, requireColumn } from './sheet-headers';

const STRATEGIES_SHEET_NAME = 'Strategies';

export interface SheetTradingStrategy {
  id: string;
  name: string;
  version: string;
  type: string;
  enabled: boolean;
  riskPercent: number;
  maxPositions: number;
  description: string;
}

export function mapTradingStrategyRow(
  headers: readonly unknown[],
  row: readonly unknown[]
): SheetTradingStrategy {
  return {
    id: String(row[requireColumn(headers, 'Strategy ID')] || '').trim(),
    name: String(row[requireColumn(headers, 'Name')] || '').trim(),
    version: String(row[requireColumn(headers, 'Version')] || '').trim(),
    type: String(row[requireColumn(headers, 'Type')] || '').trim(),
    enabled: row[requireColumn(headers, 'Enabled')] === true,
    riskPercent: Number(row[requireColumn(headers, 'Risk %')]) || 0,
    maxPositions: Number(row[requireColumn(headers, 'Max Positions')]) || 0,
    description: String(row[requireColumn(headers, 'Description')] || '').trim()
  };
}

export class GoogleSheetsTradingStrategyReader {
  getById(strategyId: string): SheetTradingStrategy {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STRATEGIES_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      throw new Error('Aucune stratégie configurée.');
    }
    const headers = readSheetHeaders(sheet);
    const idIndex = requireColumn(headers, 'Strategy ID');
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const expected = String(strategyId).trim().toUpperCase();
    const row = rows.find(
      (candidate) =>
        String(candidate[idIndex] || '')
          .trim()
          .toUpperCase() === expected
    );
    if (!row) throw new Error(`Stratégie inconnue : ${strategyId}`);
    return mapTradingStrategyRow(headers, row);
  }

  listEnabled(): SheetTradingStrategy[] {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STRATEGIES_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) return [];
    const headers = readSheetHeaders(sheet);
    return sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => mapTradingStrategyRow(headers, row))
      .filter((strategy) => strategy.enabled);
  }
}
