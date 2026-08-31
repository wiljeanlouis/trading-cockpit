import {
  requireUniqueTradingAccountIds,
  type TradingAccount
} from '@trading-cockpit/core/domain/trading-account';
import type { TradingAccountRepository } from '@trading-cockpit/core/ports/outbound/trading-account-repository';
import { TRADING_ACCOUNT_HEADERS, tradingAccountFromRow } from './trading-account-mapper';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable, requireSheetHeaders } from '../sheet-headers';
import { isSheetEffectivelyEmpty } from '../data-sheet';

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
    const { headers, rows } = readSheetTable(sheet);
    requireSheetHeaders(headers, TRADING_ACCOUNT_HEADERS, ACCOUNTS_SHEET_NAME);
    const accounts = rows
      .filter((row) => row.some((value) => String(value || '').trim()))
      .map((row) => tradingAccountFromRow(headers, row));
    requireUniqueTradingAccountIds(accounts);
    return accounts;
  }

  private getOrCreateSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheet = getTradingCockpitSpreadsheet();
    const existing = spreadsheet.getSheetByName(ACCOUNTS_SHEET_NAME);
    if (existing && !isSheetEffectivelyEmpty(existing)) return existing;

    const sheet = existing ?? spreadsheet.insertSheet(ACCOUNTS_SHEET_NAME);
    sheet.clear();
    sheet
      .getRange(1, 1, 1, TRADING_ACCOUNT_HEADERS.length)
      .setValues([[...TRADING_ACCOUNT_HEADERS]])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, TRADING_ACCOUNT_HEADERS.length);
    return sheet;
  }
}
