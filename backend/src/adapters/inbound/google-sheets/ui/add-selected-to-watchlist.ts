import type { AddCandidateToWatchlist } from '@trading-cockpit/backend-core/application/watchlist/add-candidate-to-watchlist';
import { rankingRowToAddCandidateCommand } from './ranking-candidate-mapper';

const MOMENTUM_RANKING_SHEET_NAME = 'Momentum Ranking';

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

  if (rowNumber < 6) {
    throw new Error('Sélectionne une ligne contenant un candidat.');
  }

  const lastColumn = sourceSheet.getLastColumn();
  const headers = sourceSheet
    .getRange(5, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());
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
