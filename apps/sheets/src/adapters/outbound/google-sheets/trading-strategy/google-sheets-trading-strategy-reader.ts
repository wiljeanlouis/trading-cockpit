import { readSheetTable } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import {
  hasMeaningfulStrategyTableRow,
  mapTradingStrategyRow,
  mapTradingStrategyVersionRow,
  type SheetTradingStrategy
} from './trading-strategy-mapper';
import {
  normalizeTradingStrategy,
  type TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';

const STRATEGIES_SHEET_NAME = 'Strategies';
const STRATEGY_VERSIONS_SHEET_NAME = 'Strategy Versions';

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
      .filter((row) => hasMeaningfulStrategyTableRow(row))
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
      .filter((row) => hasMeaningfulStrategyTableRow(row))
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
