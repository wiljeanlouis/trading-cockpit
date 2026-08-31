import type { AddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';
import { rankingRowToAddCandidateCommand } from './ranking-candidate-mapper';
import {
  DATA_SHEET_HEADER_ROW,
  DATA_SHEET_DATA_START_ROW
} from '../../../outbound/google-sheets/data-sheet';
import {
  MOMENTUM_RANKING_HEADERS,
  MOMENTUM_RANKING_SHEET_NAME
} from '../../../outbound/google-sheets/momentum/momentum-ranking-schema';

export function addSelectedRankingCandidateToWatchlist(
  addCandidateToWatchlist: AddCandidateToWatchlist
): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getActiveSheet();

  if (sourceSheet.getName() !== MOMENTUM_RANKING_SHEET_NAME) {
    throw new Error(`Sélectionne d'abord un titre dans ${MOMENTUM_RANKING_SHEET_NAME}.`);
  }

  const selectedRange = sourceSheet.getActiveRange();

  if (!selectedRange) {
    throw new Error('Aucune ligne sélectionnée.');
  }

  const rowNumber = selectedRange.getRow();
  const lastColumn = sourceSheet.getLastColumn();
  const headers = sourceSheet
    .getRange(DATA_SHEET_HEADER_ROW, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());
  if (!hasRankingHeaders(headers) || rowNumber < DATA_SHEET_DATA_START_ROW) {
    throw new Error('Sélectionne une ligne contenant un candidat.');
  }
  const row: unknown[] = sourceSheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const result = addCandidateToWatchlist(rankingRowToAddCandidateCommand(headers, row));

  if (result.kind === 'duplicate') {
    spreadsheet.toast(
      `${result.identity.ticker} est déjà dans la Watchlist pour ` +
        `${result.identity.strategyId} ${result.identity.strategyVersion}.`,
      'Trading Cockpit',
      5
    );

    return;
  }

  spreadsheet.toast(
    `${result.entry.ticker} ajouté à la Watchlist pour ${result.entry.strategyId}.`,
    'Trading Cockpit',
    5
  );
}

function hasRankingHeaders(headers: readonly string[]): boolean {
  return MOMENTUM_RANKING_HEADERS.every((header) => headers.includes(header));
}
