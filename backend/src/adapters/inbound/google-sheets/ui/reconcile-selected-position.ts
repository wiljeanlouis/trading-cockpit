import type {
  ReconcileClosedPosition,
  ReconcileClosedPositionResult
} from '@trading-cockpit/backend-core/application/position/reconcile-closed-position';
import { selectedPositionId } from './position-close-selection-mapper';

const POSITIONS_SHEET_NAME = 'Positions';

function reconciliationMessage(result: ReconcileClosedPositionResult): string {
  if (result.status === 'BLOCKED') {
    return `Réconciliation bloquée — ${result.diagnostics.join(' ')}`;
  }
  if (result.status === 'NO_ACTION') {
    return `Position ${result.positionId} déjà cohérente.`;
  }
  const journal = result.journal === 'CREATED' ? 'Journal créé' : 'Journal déjà présent';
  const watchlist = result.watchlist === 'UPDATED' ? 'Watchlist fermée' : 'Watchlist déjà fermée';
  return `Position ${result.positionId} réconciliée — ${journal}, ${watchlist}.`;
}

export function reconcileSelectedPositionRow(reconcile: ReconcileClosedPosition): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();

  if (sheet.getName() !== POSITIONS_SHEET_NAME) {
    throw new Error(`Sélectionne une position dans ${POSITIONS_SHEET_NAME}.`);
  }

  const selectedRange = sheet.getActiveRange();
  if (!selectedRange) throw new Error('Aucune position sélectionnée.');
  const rowNumber = selectedRange.getRow();
  if (rowNumber < 2) throw new Error('Sélectionne une ligne contenant une position.');

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());
  const row: unknown[] = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const result = reconcile({ positionId: selectedPositionId(headers, row) });

  spreadsheet.toast(reconciliationMessage(result), 'Trading Cockpit', 7);
}
