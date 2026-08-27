import { isOpenPositionStatus, type Position } from '../../../core/domain/position';
import type { PositionRepository } from '../../../ports/outbound/position-repository';
import { positionFromRow, positionToRow } from './position-mapper';

declare function getOrCreatePositionsSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validatePositionsSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addPositionFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatPositionRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;

export class GoogleSheetsPositionRepository implements PositionRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private schemaValidated = false;

  findOpenByTradePlanId(tradePlanId: string): Position | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return null;
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
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

  private getValidatedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreatePositionsSheet();
    }

    if (!this.schemaValidated) {
      validatePositionsSchema(this.sheet);
      this.schemaValidated = true;
    }

    return this.sheet;
  }
}
