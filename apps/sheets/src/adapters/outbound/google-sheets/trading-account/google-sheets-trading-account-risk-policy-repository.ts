import type { TradingAccountRiskPolicy } from '@trading-cockpit/core/domain/trading-account-risk-policy';
import type { TradingAccountRiskPolicyRepository } from '@trading-cockpit/core/ports/outbound/trading-account-risk-policy-repository';
import {
  TRADING_ACCOUNT_HEADERS,
  tradingAccountRiskPolicyFromRow
} from '../trading-account/trading-account-mapper';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable, requireSheetHeaders } from '../sheet-headers';

const ACCOUNTS_SHEET_NAME = 'Accounts';
const RISK_HEADER = 'Risk % Per Trade';

export class GoogleSheetsTradingAccountRiskPolicyRepository implements TradingAccountRiskPolicyRepository {
  ensureReady(): void {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(ACCOUNTS_SHEET_NAME);
    if (sheet) this.refreshRiskValidation(sheet);
  }

  findByAccountId(accountId: string): TradingAccountRiskPolicy | null {
    const spreadsheet = getTradingCockpitSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ACCOUNTS_SHEET_NAME);
    if (!sheet) return null;
    const table = readSheetTable(sheet);
    const headers = this.refreshRiskValidation(sheet, table.headers);
    const idIndex = headers.indexOf('Account ID');
    const riskIndex = headers.indexOf(RISK_HEADER);
    if (idIndex === -1) throw new Error('Colonne absente : Account ID');
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    const row = table.rows.find(
      (candidate) =>
        String(candidate[idIndex] || '')
          .trim()
          .toUpperCase() === normalizedId
    );
    if (!row || row[riskIndex] === '' || row[riskIndex] === null || row[riskIndex] === undefined) {
      return null;
    }
    return tradingAccountRiskPolicyFromRow(headers, row);
  }

  private refreshRiskValidation(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers?: readonly string[]
  ): string[] {
    const currentHeaders =
      headers ??
      sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0]
        .map((value) => String(value).trim());
    requireSheetHeaders(currentHeaders, TRADING_ACCOUNT_HEADERS, ACCOUNTS_SHEET_NAME);
    const normalizedHeaders = [...currentHeaders];
    const riskColumn = normalizedHeaders.indexOf(RISK_HEADER) + 1;
    const rule = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(Number.MIN_VALUE, 1)
      .setAllowInvalid(false)
      .setHelpText('Risk % Per Trade doit être supérieur à 0 et inférieur ou égal à 100%.')
      .build();
    const dataRows = Math.max(sheet.getMaxRows() - 1, 1);
    sheet.getRange(2, riskColumn, dataRows, 1).setDataValidation(rule).setNumberFormat('0.00%');
    return normalizedHeaders;
  }
}
