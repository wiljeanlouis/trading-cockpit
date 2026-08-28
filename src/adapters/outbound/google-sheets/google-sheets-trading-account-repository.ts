import {
  requireUniqueTradingAccountIds,
  type TradingAccount
} from '../../../core/domain/trading-account';
import type { TradingAccountRepository } from '../../../ports/outbound/trading-account-repository';
import { TRADING_ACCOUNT_HEADERS, tradingAccountFromRow } from './trading-account-mapper';

const ACCOUNTS_SHEET_NAME = 'Accounts';

export class GoogleSheetsTradingAccountRepository implements TradingAccountRepository {
  findById(accountId: string): TradingAccount | null {
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    return this.findAll().find((account) => account.id === normalizedId) ?? null;
  }

  findAll(): TradingAccount[] {
    const sheet = this.getOrCreateSheet();
    if (sheet.getLastRow() <= 1) return [];
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const accounts = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues()
      .filter((row) => row.some((value) => String(value || '').trim()))
      .map((row) => tradingAccountFromRow(headers, row));
    requireUniqueTradingAccountIds(accounts);
    return accounts;
  }

  private getOrCreateSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const existing = spreadsheet.getSheetByName(ACCOUNTS_SHEET_NAME);
    if (existing) return existing;

    const sheet = spreadsheet.insertSheet(ACCOUNTS_SHEET_NAME);
    sheet
      .getRange(1, 1, 1, TRADING_ACCOUNT_HEADERS.length)
      .setValues([[...TRADING_ACCOUNT_HEADERS]])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, TRADING_ACCOUNT_HEADERS.length);
    return sheet;
  }
}
