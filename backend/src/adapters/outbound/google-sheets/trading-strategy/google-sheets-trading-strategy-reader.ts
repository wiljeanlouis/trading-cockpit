import { readSheetHeaders, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';

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
    const strategies = this.listAll();
    const expected = String(strategyId).trim().toUpperCase();
    const strategy = strategies.find((candidate) => candidate.id.trim().toUpperCase() === expected);
    if (!strategy) throw new Error(`Stratégie inconnue : ${strategyId}`);
    return strategy;
  }

  listAll(): SheetTradingStrategy[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(STRATEGIES_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      throw new Error('Aucune stratégie configurée.');
    }
    const headers = readSheetHeaders(sheet);
    return sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues()
      .map((row) => mapTradingStrategyRow(headers, row));
  }

  listEnabled(): SheetTradingStrategy[] {
    try {
      return this.listAll().filter((strategy) => strategy.enabled);
    } catch (error) {
      if (error instanceof Error && error.message === 'Aucune stratégie configurée.') return [];
      throw error;
    }
  }
}
