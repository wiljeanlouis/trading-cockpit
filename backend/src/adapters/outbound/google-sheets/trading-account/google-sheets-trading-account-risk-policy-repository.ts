import type { TradingAccountRiskPolicy } from '../../../../core/domain/trading-account-risk-policy';
import type { TradingAccountRiskPolicyRepository } from '../../../../ports/outbound/trading-account-risk-policy-repository';
import { tradingAccountRiskPolicyFromRow } from '../trading-account/trading-account-mapper';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';

const ACCOUNTS_SHEET_NAME = 'Accounts';
const RISK_HEADER = 'Risk % Per Trade';

export class GoogleSheetsTradingAccountRiskPolicyRepository implements TradingAccountRiskPolicyRepository {
  ensureReady(): void {
    const sheet = getTradingCockpitSpreadsheet().getSheetByName(ACCOUNTS_SHEET_NAME);
    if (sheet) this.ensureRiskColumn(sheet);
  }

  findByAccountId(accountId: string): TradingAccountRiskPolicy | null {
    const spreadsheet = getTradingCockpitSpreadsheet();
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
    const currentHeaders = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const riskColumn = currentHeaders.indexOf(RISK_HEADER) + 1;
    const rule = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(Number.MIN_VALUE, 1)
      .setAllowInvalid(false)
      .setHelpText('Risk % Per Trade doit être supérieur à 0 et inférieur ou égal à 100%.')
      .build();
    const dataRows = Math.max(sheet.getMaxRows() - 1, 1);
    sheet.getRange(2, riskColumn, dataRows, 1).setDataValidation(rule).setNumberFormat('0.00%');
  }
}
