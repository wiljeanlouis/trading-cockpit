import type { MomentumCandidate } from '@trading-cockpit/core/domain/momentum';
import type {
  MomentumSignalRepository,
  MomentumStrategyRepository,
  MomentumStrategySnapshot
} from '@trading-cockpit/core/ports/outbound/momentum-signal-repository';
import { GoogleSheetsTradingStrategyReader } from '../trading-strategy/google-sheets-trading-strategy-reader';
import { requireColumn } from '../sheet-headers';

const SIGNALS_HISTORY_SHEET_NAME = 'Signals History';

function requireColumnAfter(headers: string[], name: string, afterIndex: number): number {
  const expected = name.trim().toLowerCase();
  for (let index = afterIndex + 1; index < headers.length; index += 1) {
    if (headers[index].trim().toLowerCase() === expected) return index;
  }
  throw new Error(`Colonne Finviz absente : ${name}`);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  const parsed = Number(text.replace('%', '').replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return text.endsWith('%') ? parsed / 100 : parsed;
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    return Utilities.formatDate(value, spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).trim().substring(0, 10);
}

export class GoogleSheetsMomentumStrategyRepository implements MomentumStrategyRepository {
  constructor(private readonly reader = new GoogleSheetsTradingStrategyReader()) {}

  getById(strategyId: string): MomentumStrategySnapshot {
    const value = this.reader.getById(strategyId);
    return {
      id: value.id,
      name: value.name,
      version: value.version,
      enabled: value.enabled
    };
  }
}

export class GoogleSheetsMomentumSignalRepository implements MomentumSignalRepository {
  findByStrategy(strategyId: string, strategyVersion: string): MomentumCandidate[] {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SIGNALS_HISTORY_SHEET_NAME);
    if (!sheet) {
      throw new Error('Signals History est absent. Lance d’abord Refresh Finviz.');
    }
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('Signals History ne contient aucun signal.');
    }

    const headers = data[0].map((value) => String(value).trim());
    const signalDateIndex = requireColumn(headers, 'Signal Date');
    const strategyIdIndex = requireColumn(headers, 'Strategy ID');
    const strategyIndex = requireColumn(headers, 'Strategy');
    const versionIndex = requireColumn(headers, 'Strategy Version');
    const tickerIndex = requireColumn(headers, 'Ticker');
    const companyIndex = requireColumnAfter(headers, 'Company', tickerIndex);
    const sectorIndex = requireColumnAfter(headers, 'Sector', tickerIndex);
    const priceIndex = requireColumnAfter(headers, 'Price', tickerIndex);
    const high52Index = requireColumnAfter(headers, '52-Week High', tickerIndex);
    const relativeVolumeIndex = requireColumnAfter(headers, 'Relative Volume', tickerIndex);
    const performanceMonthIndex = requireColumnAfter(headers, 'Performance (Month)', tickerIndex);
    const rsiIndex = requireColumnAfter(headers, 'Relative Strength Index (14)', tickerIndex);
    const sma20Index = requireColumnAfter(headers, '20-Day Simple Moving Average', tickerIndex);

    return data
      .slice(1)
      .filter((row) => {
        const rowStrategyId = String(row[strategyIdIndex] || '')
          .trim()
          .toUpperCase();
        const rowVersion = String(row[versionIndex] || '').trim();
        return rowStrategyId === strategyId.toUpperCase() && rowVersion === strategyVersion;
      })
      .map((row) => ({
        strategyId: String(row[strategyIdIndex] || strategyId).trim(),
        strategy: String(row[strategyIndex] || '').trim(),
        strategyVersion: String(row[versionIndex] || strategyVersion).trim(),
        signalDate: normalizeSignalDate(row[signalDateIndex]),
        ticker: String(row[tickerIndex] || '')
          .trim()
          .toUpperCase(),
        company: row[companyIndex] || '',
        sector: row[sectorIndex] || '',
        price: parseNumber(row[priceIndex]),
        high52: parsePercent(row[high52Index]),
        relativeVolume: parseNumber(row[relativeVolumeIndex]),
        performanceMonth: parsePercent(row[performanceMonthIndex]),
        rsi: parseNumber(row[rsiIndex]),
        sma20: parsePercent(row[sma20Index])
      }));
  }
}
