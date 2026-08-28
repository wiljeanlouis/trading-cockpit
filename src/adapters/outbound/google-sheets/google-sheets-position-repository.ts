import { isOpenPositionStatus, type Position } from '../../../core/domain/position';
import type { PositionRepository } from '../../../ports/outbound/position-repository';
import { positionFromRow, positionToRow } from './position-mapper';
import {
  addPositionFormulas,
  ensurePositionAccountColumn,
  formatPositionRow,
  getOrCreatePositionsSheet,
  validatePositionsSchema
} from './position-sheet';
import { readSheetHeaders, requireColumn } from './sheet-headers';

export class GoogleSheetsPositionRepository implements PositionRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private schemaValidated = false;

  findById(id: string): Position | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) return null;

    const headers = readSheetHeaders(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalizedId = String(id || '').trim();

    for (const row of rows) {
      const position = positionFromRow(headers, row);
      if (position.id === normalizedId) return position;
    }

    return null;
  }

  findOpenByTradePlanId(tradePlanId: string): Position | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return null;
    }

    const headers = readSheetHeaders(sheet);
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalizedTradePlanId = String(tradePlanId || '').trim();

    for (const row of rows) {
      const position = positionFromRow(headers, row);

      if (position.tradePlanId === normalizedTradePlanId && isOpenPositionStatus(position.status)) {
        return position;
      }
    }

    return null;
  }

  save(position: Position): void {
    const sheet = this.getValidatedSheet();

    sheet.appendRow(positionToRow(position));

    const insertedRow = sheet.getLastRow();

    addPositionFormulas(sheet, insertedRow);
    formatPositionRow(sheet, insertedRow);
  }

  close(position: Position): void {
    const sheet = this.getValidatedSheet();
    const headers = readSheetHeaders(sheet);
    const idIndex = requireColumn(headers, 'Position ID');
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) throw new Error(`Position ID introuvable : ${position.id}`);

    const ids: unknown[][] = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
    const offset = ids.findIndex(([value]) => String(value || '').trim() === position.id);

    if (offset === -1) throw new Error(`Position ID introuvable : ${position.id}`);

    const row = offset + 2;
    this.setValue(sheet, headers, row, 'Closed At', position.closedAt);
    this.setValue(sheet, headers, row, 'Exit Price', position.exitPrice);
    this.setValue(sheet, headers, row, 'Realized P&L', position.realizedPnl);
    this.setValue(sheet, headers, row, 'Status', position.status);
  }

  private setValue(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers: string[],
    row: number,
    name: string,
    value: unknown
  ): void {
    sheet.getRange(row, requireColumn(headers, name) + 1).setValue(value);
  }

  private getValidatedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreatePositionsSheet();
    }

    if (!this.schemaValidated) {
      validatePositionsSchema(this.sheet);
      ensurePositionAccountColumn(this.sheet);
      this.schemaValidated = true;
    }

    return this.sheet;
  }
}
