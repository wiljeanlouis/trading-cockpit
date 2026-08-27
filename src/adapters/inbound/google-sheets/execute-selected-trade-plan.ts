import type { OpenPositionFromTradePlan } from '../../../core/application/position/open-position-from-trade-plan';
import { selectedTradePlanRowToCommand } from './trade-plan-selection-mapper';

const TRADE_PLANS_SHEET_NAME = 'Trade Plans';

declare function themePositions(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export function executeSelectedTradePlanRow(openPosition: OpenPositionFromTradePlan): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadsheet.getActiveSheet();

  if (sourceSheet.getName() !== TRADE_PLANS_SHEET_NAME) {
    throw new Error(`Sélectionne un Trade Plan dans ${TRADE_PLANS_SHEET_NAME}.`);
  }

  const selectedRange = sourceSheet.getActiveRange();

  if (!selectedRange) {
    throw new Error('Aucun Trade Plan sélectionné.');
  }

  const rowNumber = selectedRange.getRow();

  if (rowNumber < 2) {
    throw new Error('Sélectionne une ligne contenant un Trade Plan.');
  }

  const lastColumn = sourceSheet.getLastColumn();
  const headers = sourceSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());
  const row: unknown[] = sourceSheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const result = openPosition(selectedTradePlanRowToCommand(headers, row));

  if (result.kind === 'duplicate') {
    spreadsheet.toast(`${result.ticker} possède déjà une position ouverte.`, 'Trading Cockpit', 5);
    return;
  }

  themePositions(spreadsheet);
  spreadsheet.toast(`${result.position.ticker} exécuté — position créée.`, 'Trading Cockpit', 5);
}
