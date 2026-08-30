import type {
  DashboardMomentumCandidateSnapshot,
  DashboardPositionSnapshot,
  DashboardRepository,
  DashboardRepositorySnapshot,
  DashboardTradePlanSnapshot,
  DashboardWatchlistSnapshot
} from '../../../../ports/outbound/dashboard-repository';
import { readSheetTable, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';

const SHEETS = {
  momentumRanking: 'Momentum Ranking',
  watchlist: 'Watchlist',
  tradePlans: 'Trade Plans',
  positions: 'Positions'
} as const;

function valueByHeader(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function textValue(value: unknown): string {
  return String(value || '').trim();
}

function nullableText(value: unknown): string | null {
  const text = textValue(value);
  return text || null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function readMomentumCandidates(
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null
): DashboardMomentumCandidateSnapshot[] {
  if (!sheet || sheet.getLastRow() < 6) return [];
  const { headers, rows } = readSheetTable(sheet, 5);
  return rows
    .map((row) => ({
      rank: nullableNumber(valueByHeader(headers, row, 'Rank')),
      ticker: textValue(valueByHeader(headers, row, 'Ticker')).toUpperCase(),
      score: nullableNumber(valueByHeader(headers, row, 'Momentum Score')),
      price: nullableNumber(valueByHeader(headers, row, 'Price')),
      high52: nullableNumber(valueByHeader(headers, row, '52W High')),
      relativeVolume: nullableNumber(valueByHeader(headers, row, 'Relative Volume')),
      rsi: nullableNumber(valueByHeader(headers, row, 'RSI')),
      reviewStatus: nullableText(valueByHeader(headers, row, 'Review Status'))
    }))
    .filter((candidate) => Boolean(candidate.ticker));
}

function readWatchlist(
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null
): DashboardWatchlistSnapshot[] {
  if (!sheet) return [];
  const { headers, rows } = readSheetTable(sheet);
  if (rows.length === 0) return [];
  return rows
    .map((row) => ({
      ticker: textValue(valueByHeader(headers, row, 'Ticker')).toUpperCase(),
      currentPrice: nullableNumber(valueByHeader(headers, row, 'Current Price')),
      signalPrice: nullableNumber(valueByHeader(headers, row, 'Signal Price')),
      changeSinceSignal: nullableNumber(valueByHeader(headers, row, 'Change Since Signal')),
      breakoutLevel: nullableNumber(valueByHeader(headers, row, 'Breakout Level')),
      distanceToBreakout: nullableNumber(valueByHeader(headers, row, 'Distance to Breakout')),
      setupStatus: nullableText(valueByHeader(headers, row, 'Setup Status')),
      status: textValue(valueByHeader(headers, row, 'Status')).toUpperCase()
    }))
    .filter((entry) => Boolean(entry.ticker));
}

function readTradePlans(
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null
): DashboardTradePlanSnapshot[] {
  if (!sheet) return [];
  const { headers, rows } = readSheetTable(sheet);
  if (rows.length === 0) return [];
  return rows.map((row) => ({
    status: textValue(valueByHeader(headers, row, 'Status')).toUpperCase()
  }));
}

function readPositions(
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null
): DashboardPositionSnapshot[] {
  if (!sheet) return [];
  const { headers, rows } = readSheetTable(sheet);
  if (rows.length === 0) return [];
  return rows
    .map((row) => ({
      ticker: textValue(valueByHeader(headers, row, 'Ticker')).toUpperCase(),
      actualEntry: nullableNumber(valueByHeader(headers, row, 'Actual Entry')),
      currentPrice: nullableNumber(valueByHeader(headers, row, 'Current Price')),
      currentStop: nullableNumber(valueByHeader(headers, row, 'Current Stop')),
      target: nullableNumber(valueByHeader(headers, row, 'Target')),
      actualQuantity: nullableNumber(valueByHeader(headers, row, 'Actual Quantity')),
      unrealizedPnl: nullableNumber(valueByHeader(headers, row, 'Unrealized P&L')),
      unrealizedPnlPercent: nullableNumber(valueByHeader(headers, row, 'Unrealized P&L %')),
      status: textValue(valueByHeader(headers, row, 'Status')).toUpperCase()
    }))
    .filter((position) => Boolean(position.ticker));
}

export class GoogleSheetsDashboardRepository implements DashboardRepository {
  readSnapshot(): DashboardRepositorySnapshot {
    const spreadsheet = getTradingCockpitSpreadsheet();
    return {
      momentumCandidates: readMomentumCandidates(
        spreadsheet.getSheetByName(SHEETS.momentumRanking)
      ),
      watchlist: readWatchlist(spreadsheet.getSheetByName(SHEETS.watchlist)),
      tradePlans: readTradePlans(spreadsheet.getSheetByName(SHEETS.tradePlans)),
      positions: readPositions(spreadsheet.getSheetByName(SHEETS.positions))
    };
  }
}
