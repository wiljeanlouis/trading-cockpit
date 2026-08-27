import type { ClosePosition } from '../../../core/application/position/close-position';
import { closePositionCommand, selectedPositionForClose } from './position-close-selection-mapper';

const POSITIONS_SHEET_NAME = 'Positions';

declare function themePositions(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export function closeSelectedPositionRow(closePosition: ClosePosition): void {
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
  const selected = selectedPositionForClose(headers, row);
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    `Fermer ${selected.ticker}`,
    'Prix réel/simulé de sortie :',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const result = closePosition(
    closePositionCommand(selected.positionId, response.getResponseText())
  );
  themePositions(spreadsheet);
  spreadsheet.toast(
    `${result.position.ticker} fermé — P&L : ${Number(result.position.realizedPnl).toFixed(2)}`,
    'Trading Cockpit',
    6
  );
}
