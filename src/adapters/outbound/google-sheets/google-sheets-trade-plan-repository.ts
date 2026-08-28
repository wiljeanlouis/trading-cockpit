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

  findById(id: string): TradePlan | null {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return null;
    }

    const headers = this.getHeaders(sheet);
    const idIndex = this.requireColumn(headers, 'Trade Plan ID');
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalizedId = String(id || '').trim();

    for (const row of rows) {
      if (String(row[idIndex] || '').trim() === normalizedId) {
        return tradePlanFromRow(headers, row);
      }
    }

    return null;
  }

  findActiveByWatchlistIdAndAccountId(watchlistId: string, accountId: string): TradePlan | null {
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
    const normalizedAccountId = String(accountId).trim().toUpperCase();

    for (const row of rows) {
      const tradePlan = tradePlanFromRow(headers, row);

      if (
        tradePlan.watchlistId === normalizedWatchlistId &&
        tradePlan.accountId === normalizedAccountId &&
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

  updateStatus(id: string, status: string): void {
    const sheet = this.getValidatedSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      throw new Error(`Trade Plan ID introuvable : ${id}`);
    }

    const headers = this.getHeaders(sheet);
    const idIndex = this.requireColumn(headers, 'Trade Plan ID');
    const statusIndex = this.requireColumn(headers, 'Status');
    const rows: unknown[][] = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const normalizedId = String(id || '').trim();

    for (let index = 0; index < rows.length; index += 1) {
      if (String(rows[index][idIndex] || '').trim() === normalizedId) {
        sheet.getRange(index + 2, statusIndex + 1).setValue(status);
        return;
      }
    }

    throw new Error(`Trade Plan ID introuvable : ${id}`);
  }

  private getHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
    return sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
  }

  private requireColumn(headers: string[], name: string): number {
    const expected = name.trim().toLowerCase();
    const index = headers.findIndex((header) => header.trim().toLowerCase() === expected);

    if (index === -1) {
      throw new Error(`Colonne absente : ${name}`);
    }

    return index;
  }

  private getValidatedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.sheet) {
      this.sheet = getOrCreateTradePlansSheet();
    }

    if (!this.schemaValidated) {
      this.ensureAccountColumn(this.sheet);
      validateTradePlansSchema(this.sheet);
      this.schemaValidated = true;
    }

    return this.sheet;
  }

  private ensureAccountColumn(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
    const headers = this.getHeaders(sheet);
    if (!headers.includes('Account ID')) {
      sheet
        .getRange(1, sheet.getLastColumn() + 1)
        .setValue('Account ID')
        .setFontWeight('bold');
    }
  }
}
