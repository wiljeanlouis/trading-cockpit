import type {
  DashboardPipelineSnapshot,
  DashboardSummaryRepository
} from '../../../../ports/outbound/dashboard-summary-repository';
import { readSheetHeaders, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';

const SHEETS = {
  momentumRanking: 'Momentum Ranking',
  watchlist: 'Watchlist',
  tradePlans: 'Trade Plans',
  positions: 'Positions',
  journal: 'Journal'
} as const;

function dataRows(sheet: GoogleAppsScript.Spreadsheet.Sheet | null): unknown[][] {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
}

function normalized(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function countStatus(
  sheet: GoogleAppsScript.Spreadsheet.Sheet | null,
  acceptedStatuses: readonly string[]
): number {
  const rows = dataRows(sheet);
  if (rows.length === 0 || !sheet) return 0;
  const statusIndex = requireColumn(readSheetHeaders(sheet), 'Status');
  return rows.filter((row) => acceptedStatuses.includes(normalized(row[statusIndex]))).length;
}

export class GoogleSheetsDashboardSummaryRepository implements DashboardSummaryRepository {
  readPipelineSnapshot(): DashboardPipelineSnapshot {
    const spreadsheet = getTradingCockpitSpreadsheet();
    const ranking = spreadsheet.getSheetByName(SHEETS.momentumRanking);
    const watchlist = spreadsheet.getSheetByName(SHEETS.watchlist);
    const tradePlans = spreadsheet.getSheetByName(SHEETS.tradePlans);
    const positions = spreadsheet.getSheetByName(SHEETS.positions);
    const journal = spreadsheet.getSheetByName(SHEETS.journal);

    const watchlistRows = dataRows(watchlist);
    let watchlistCount = 0;
    let ready = 0;
    if (watchlist && watchlistRows.length > 0) {
      const headers = readSheetHeaders(watchlist);
      const tickerIndex = requireColumn(headers, 'Ticker');
      const statusIndex = requireColumn(headers, 'Status');
      for (const row of watchlistRows) {
        if (!String(row[tickerIndex] || '').trim()) continue;
        watchlistCount += 1;
        if (normalized(row[statusIndex]) === 'READY') ready += 1;
      }
    }

    let closedTrades = 0;
    const journalRows = dataRows(journal);
    if (journal && journalRows.length > 0) {
      const positionIdIndex = requireColumn(readSheetHeaders(journal), 'Position ID');
      closedTrades = journalRows.filter((row) => String(row[positionIdIndex] || '').trim()).length;
    }

    return {
      signals: ranking && ranking.getLastRow() >= 6 ? ranking.getLastRow() - 5 : 0,
      watchlist: watchlistCount,
      ready,
      activeTradePlans: countStatus(tradePlans, ['DRAFT', 'READY']),
      openPositions: countStatus(positions, ['OPEN']),
      closedTrades
    };
  }
}
