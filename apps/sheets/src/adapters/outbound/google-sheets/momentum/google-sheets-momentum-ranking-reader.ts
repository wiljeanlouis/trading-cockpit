import type {
  MomentumRankingIdentity,
  MomentumRankingReader,
  MomentumRankingRecord
} from '@trading-cockpit/core/ports/outbound/momentum-ranking-reader';
import { requireColumn } from '../sheet-headers';
import { DATA_SHEET_HEADER_ROW } from '../data-sheet';
import { MOMENTUM_RANKING_HEADERS, MOMENTUM_RANKING_SHEET_NAME } from './momentum-ranking-schema';

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

function normalizeHeaders(row: readonly unknown[]): string[] {
  return row.map((value) => String(value).trim());
}

function hasRequiredRankingHeaders(headers: readonly string[]): boolean {
  return MOMENTUM_RANKING_HEADERS.every((header) => headers.includes(header));
}

function readRankingTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): { headers: string[]; rows: unknown[][] } | null {
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastColumn === 0 || lastRow < DATA_SHEET_HEADER_ROW) return null;

  const normalizedHeaders = normalizeHeaders(sheet.getRange(1, 1, 1, lastColumn).getValues()[0]);
  if (hasRequiredRankingHeaders(normalizedHeaders)) {
    const rowCount = Math.max(lastRow - DATA_SHEET_HEADER_ROW + 1, 1);
    const values = sheet.getRange(DATA_SHEET_HEADER_ROW, 1, rowCount, lastColumn).getValues();
    return { headers: normalizeHeaders(values[0] ?? []), rows: values.slice(1) };
  }
  return null;
}

export class GoogleSheetsMomentumRankingReader implements MomentumRankingReader {
  findAll(): MomentumRankingRecord[] {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MOMENTUM_RANKING_SHEET_NAME);
    if (!sheet) return [];

    const table = readRankingTable(sheet);
    if (!table) return [];

    return table.rows
      .map((row) => rowToRecord(table.headers, row))
      .filter(
        (record) =>
          record.strategyId && record.strategyVersion && record.signalDate && record.ticker
      );
  }

  findByIdentity(identity: MomentumRankingIdentity): MomentumRankingRecord | null {
    return this.findAll().find((record) => sameIdentity(record, identity)) ?? null;
  }
}
