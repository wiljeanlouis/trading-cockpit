import type { TradingAccountRiskPolicy } from '../../../core/domain/trading-account-risk-policy';
import type { TradingAccountRiskPolicyRepository } from '../../../ports/outbound/trading-account-risk-policy-repository';
import { tradingAccountRiskPolicyFromRow } from './trading-account-mapper';

const ACCOUNTS_SHEET_NAME = 'Accounts';
const RISK_HEADER = 'Risk % Per Trade';

export class GoogleSheetsTradingAccountRiskPolicyRepository implements TradingAccountRiskPolicyRepository {
  ensureReady(): void {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACCOUNTS_SHEET_NAME);
    if (sheet) this.ensureRiskColumn(sheet);
  }

  findByAccountId(accountId: string): TradingAccountRiskPolicy | null {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ACCOUNTS_SHEET_NAME);
    if (!sheet) return null;
    this.ensureRiskColumn(sheet);
    if (sheet.getLastRow() <= 1) return null;
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const idIndex = headers.indexOf('Account ID');
    const riskIndex = headers.indexOf(RISK_HEADER);
    if (idIndex === -1) throw new Error('Colonne absente : Account ID');
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const row = rows.find(
      (candidate) =>
        String(candidate[idIndex] || '')
          .trim()
          .toUpperCase() === normalizedId
    );
    if (!row || row[riskIndex] === '' || row[riskIndex] === null) return null;
    return tradingAccountRiskPolicyFromRow(headers, row);
  }

  private ensureRiskColumn(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    if (!headers.includes(RISK_HEADER)) {
      sheet
        .getRange(1, sheet.getLastColumn() + 1)
        .setValue(RISK_HEADER)
        .setFontWeight('bold');
    }
  }
}
