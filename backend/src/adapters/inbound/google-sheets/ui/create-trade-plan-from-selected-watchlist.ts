import type { CreateTradePlanFromWatchlist } from '@trading-cockpit/backend-core/application/trade-plan/create-trade-plan-from-watchlist';
import { selectedWatchlistRowToCommand } from './watchlist-selection-mapper';
import { themeTradePlans } from '../theme/theme';

const WATCHLIST_SHEET_NAME = 'Watchlist';

export function createTradePlanFromSelectedWatchlistRow(
  createTradePlan: CreateTradePlanFromWatchlist
): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getActiveSheet();

  if (sourceSheet.getName() !== WATCHLIST_SHEET_NAME) {
    throw new Error(`Sélectionne d'abord un titre dans ${WATCHLIST_SHEET_NAME}.`);
  }

  const selectedRange = sourceSheet.getActiveRange();

  if (!selectedRange) {
    throw new Error('Aucune ligne sélectionnée.');
  }

  const rowNumber = selectedRange.getRow();

  if (rowNumber < 2) {
    throw new Error('Sélectionne une ligne contenant un titre.');
  }

  const lastColumn = sourceSheet.getLastColumn();
  const headers = sourceSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());
  const row: unknown[] = sourceSheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Choisir le Trading Account', 'Account ID :', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const selected = selectedWatchlistRowToCommand(headers, row);
  const result = createTradePlan({
    watchlistId: selected.watchlistId,
    accountId: response.getResponseText()
  });

  if (result.kind === 'duplicate') {
    spreadsheet.toast(`${result.ticker} possède déjà un Trade Plan actif.`, 'Trading Cockpit', 5);
    return;
  }

  themeTradePlans(spreadsheet);
  spreadsheet.toast(
    `Trade Plan créé pour ${result.tradePlan.ticker} — ${result.tradePlan.accountId}.`,
    'Trading Cockpit',
    5
  );
}
