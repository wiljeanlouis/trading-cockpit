import { isActiveTradePlanStatus, type TradePlan } from '../../../core/domain/trade-plan';
import type { TradePlanRepository } from '../../../ports/outbound/trade-plan-repository';
import { tradePlanFromRow, tradePlanToRow } from './trade-plan-mapper';

declare function getOrCreateTradePlansSheet(): GoogleAppsScript.Spreadsheet.Sheet;
declare function validateTradePlansSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean;
declare function addTradePlanFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;
declare function formatTradePlanRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void;

export class GoogleSheetsTradePlanRepository implements TradePlanRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private schemaValidated = false;

  findActiveByWatchlistId(watchlistId: string): TradePlan | null {
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
    const normalizedWatchlistId = String(watchlistId).trim();

    for (const row of rows) {
      const tradePlan = tradePlanFromRow(headers, row);

      if (
        tradePlan.watchlistId === normalizedWatchlistId &&
        isActiveTradePlanStatus(tradePlan.status)
      ) {
        return tradePlan;
      }
    }

    return null;
  }

  save(tradePlan: TradePlan): void {
    const sheet = this.getValidatedSheet();

    sheet.appendRow(tradePlanToRow(tradePlan));

    const insertedRow = sheet.getLastRow();

    addTradePlanFormulas(sheet, insertedRow);
    formatTradePlanRow(sheet, insertedRow);
  }

  private getValidatedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreateTradePlansSheet();
    }

    if (!this.schemaValidated) {
      validateTradePlansSchema(this.sheet);
      this.schemaValidated = true;
    }

    return this.sheet;
  }
}
