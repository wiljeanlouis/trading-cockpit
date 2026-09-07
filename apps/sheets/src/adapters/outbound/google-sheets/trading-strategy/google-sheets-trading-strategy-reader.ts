import { readSheetTable, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import {
  normalizeTradingStrategy,
  normalizeTradingStrategyVersion,
  type TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';

const STRATEGIES_SHEET_NAME = 'Strategies';
const STRATEGY_VERSIONS_SHEET_NAME = 'Strategy Versions';

export interface SheetTradingStrategy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  description: string;
}

export function mapTradingStrategyRow(
  headers: readonly unknown[],
  row: readonly unknown[]
): SheetTradingStrategy {
  const idColumn = requireColumn(headers, 'Strategy ID');
  const nameColumn = requireColumn(headers, 'Name');
  const typeColumn = requireColumn(headers, 'Type');
  const enabledColumn = requireColumn(headers, 'Enabled');
  const descriptionColumn = requireColumn(headers, 'Description');
  return {
    id: String(row[idColumn] || '').trim(),
    name: String(row[nameColumn] || '').trim(),
    type: String(row[typeColumn] || '').trim(),
    enabled: requiredBoolean(row[enabledColumn], 'Enabled'),
    description: String(row[descriptionColumn] || '').trim()
  };
}

export function mapTradingStrategyVersionRow(
  headers: readonly unknown[],
  row: readonly unknown[]
): TradingStrategyVersion {
  const strategyIdColumn = requireColumn(headers, 'Strategy ID');
  const versionColumn = requireColumn(headers, 'Version');
  const enabledColumn = requireColumn(headers, 'Enabled');
  const screenerCodeColumn = requireColumn(headers, 'Screener Code');
  const screenerColumn = requireColumn(headers, 'Screener');
  const screenerUrlColumn = requireColumn(headers, 'Finviz URL');
  return normalizeTradingStrategyVersion({
    strategyId: String(row[strategyIdColumn] || '').trim(),
    version: String(row[versionColumn] || '').trim(),
    enabled: requiredBoolean(row[enabledColumn], 'Enabled'),
    screenerCode: String(row[screenerCodeColumn] || '').trim(),
    screener: String(row[screenerColumn] || '').trim(),
    screenerUrl: String(row[screenerUrlColumn] || '').trim()
  });
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
    if (!sheet) {
      throw new Error('Aucune stratégie configurée.');
    }
    if (sheet.getLastRow() <= 1) return [];
    const { headers, rows } = readSheetTable(sheet);
    return rows
      .filter((row) => hasMeaningfulTableRow(row))
      .map((row) => normalizeTradingStrategy(mapTradingStrategyRow(headers, row)));
  }

  listEnabled(): SheetTradingStrategy[] {
    try {
      return this.listAll().filter((strategy) => strategy.enabled);
    } catch (error) {
      if (error instanceof Error && error.message === 'Aucune stratégie configurée.') return [];
      throw error;
    }
  }

  listVersions(): TradingStrategyVersion[] {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(STRATEGY_VERSIONS_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }
    const { headers, rows } = readSheetTable(sheet);
    return rows
      .filter((row) => hasMeaningfulTableRow(row))
      .map((row) => mapTradingStrategyVersionRow(headers, row));
  }

  findVersion(strategyId: string, version: string): TradingStrategyVersion | null {
    const expectedId = String(strategyId).trim().toUpperCase();
    const expectedVersion = String(version).trim();
    return (
      this.listVersions().find(
        (candidate) => candidate.strategyId === expectedId && candidate.version === expectedVersion
      ) ?? null
    );
  }

  findActiveVersion(strategyId: string): TradingStrategyVersion | null {
    const expectedId = String(strategyId).trim().toUpperCase();
    return (
      this.listVersions().find(
        (candidate) => candidate.strategyId === expectedId && candidate.enabled
      ) ?? null
    );
  }
}

function hasMeaningfulTableRow(row: readonly unknown[]): boolean {
  return row.some(
    (value) => value === true || (typeof value !== 'boolean' && String(value ?? '').trim() !== '')
  );
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (value === true || value === false) return value;
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  if (text === 'TRUE') return true;
  if (text === 'FALSE') return false;
  throw new Error(`${label} obligatoire.`);
}
