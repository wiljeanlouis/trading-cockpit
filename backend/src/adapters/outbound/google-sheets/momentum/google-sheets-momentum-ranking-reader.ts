import type {
  MomentumRankingIdentity,
  MomentumRankingReader,
  MomentumRankingRecord
} from '@trading-cockpit/backend-core/ports/outbound/momentum-ranking-reader';
import { requireColumn } from '../sheet-headers';

const MOMENTUM_RANKING_SHEET_NAME = 'Momentum Ranking';

function valueByHeader(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeSignalDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    return Utilities.formatDate(value, spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).trim().substring(0, 10);
}

function normalizeIdentity(identity: MomentumRankingIdentity): MomentumRankingIdentity {
  return {
    strategyId: parseText(identity.strategyId).toUpperCase(),
    strategyVersion: parseText(identity.strategyVersion),
    signalDate: parseText(identity.signalDate).substring(0, 10),
    ticker: parseText(identity.ticker).toUpperCase()
  };
}

function rowToRecord(headers: string[], row: unknown[]): MomentumRankingRecord {
  return {
    strategyId: parseText(valueByHeader(headers, row, 'Strategy ID')),
    strategy: parseText(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: parseText(valueByHeader(headers, row, 'Strategy Version')),
    signalDate: normalizeSignalDate(valueByHeader(headers, row, 'Signal Date')),
    ticker: parseText(valueByHeader(headers, row, 'Ticker')).toUpperCase(),
    company: valueByHeader(headers, row, 'Company') || '',
    sector: valueByHeader(headers, row, 'Sector') || '',
    price: parseNumber(valueByHeader(headers, row, 'Price')),
    high52: parseNumber(valueByHeader(headers, row, '52W High')),
    high52Score: parseNumber(valueByHeader(headers, row, '52W Score')) ?? 0,
    relativeVolume: parseNumber(valueByHeader(headers, row, 'Relative Volume')),
    relativeVolumeScore: parseNumber(valueByHeader(headers, row, 'RelVol Score')) ?? 0,
    performanceMonth: parseNumber(valueByHeader(headers, row, 'Performance Month')),
    performanceScore: parseNumber(valueByHeader(headers, row, 'Performance Score')) ?? 0,
    rsi: parseNumber(valueByHeader(headers, row, 'RSI')),
    rsiScore: parseNumber(valueByHeader(headers, row, 'RSI Score')) ?? 0,
    sma20: parseNumber(valueByHeader(headers, row, 'SMA20')),
    sma20Score: parseNumber(valueByHeader(headers, row, 'SMA20 Score')) ?? 0,
    total: parseNumber(valueByHeader(headers, row, 'Momentum Score')) ?? 0,
    reviewStatus: parseText(valueByHeader(headers, row, 'Review Status')) || 'REVIEW'
  };
}

function sameIdentity(record: MomentumRankingRecord, identity: MomentumRankingIdentity): boolean {
  const normalizedRecord = normalizeIdentity({
    strategyId: record.strategyId,
    strategyVersion: record.strategyVersion,
    signalDate: record.signalDate,
    ticker: record.ticker
  });
  const normalizedIdentity = normalizeIdentity(identity);
  return (
    normalizedRecord.strategyId === normalizedIdentity.strategyId &&
    normalizedRecord.strategyVersion === normalizedIdentity.strategyVersion &&
    normalizedRecord.signalDate === normalizedIdentity.signalDate &&
    normalizedRecord.ticker === normalizedIdentity.ticker
  );
}

export class GoogleSheetsMomentumRankingReader implements MomentumRankingReader {
  findAll(): MomentumRankingRecord[] {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MOMENTUM_RANKING_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 6) return [];

    const headers = sheet
      .getRange(5, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const rows = sheet.getRange(6, 1, sheet.getLastRow() - 5, sheet.getLastColumn()).getValues();

    return rows
      .map((row) => rowToRecord(headers, row))
      .filter(
        (record) =>
          record.strategyId && record.strategyVersion && record.signalDate && record.ticker
      );
  }

  findByIdentity(identity: MomentumRankingIdentity): MomentumRankingRecord | null {
    return this.findAll().find((record) => sameIdentity(record, identity)) ?? null;
  }
}
