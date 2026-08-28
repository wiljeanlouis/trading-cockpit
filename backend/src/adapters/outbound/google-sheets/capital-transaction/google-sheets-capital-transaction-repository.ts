import type { CapitalTransaction } from '../../../../core/domain/capital-transaction';
import type { CapitalTransactionRepository } from '../../../../ports/outbound/capital-transaction-repository';
import {
  CAPITAL_LEDGER_HEADERS,
  capitalTransactionToRow,
  capitalTransactionsFromRowsForAccount
} from './capital-transaction-mapper';

const CAPITAL_LEDGER_SHEET_NAME = 'Capital Ledger';

export class GoogleSheetsCapitalTransactionRepository implements CapitalTransactionRepository {
  save(transaction: CapitalTransaction): void {
    const sheet = this.getOrCreateSheet();
    sheet.appendRow(capitalTransactionToRow(transaction));
    const row = sheet.getLastRow();
    sheet.getRange(row, 4).setNumberFormat('$0.00');
    sheet.getRange(row, 5).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }

  findByAccountId(accountId: string): CapitalTransaction[] {
    const sheet = this.getOrCreateSheet();
    if (sheet.getLastRow() <= 1) return [];
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map((value) => String(value).trim());
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    return capitalTransactionsFromRowsForAccount(headers, rows, normalizedId);
  }

  ensureReady(): void {
    this.getOrCreateSheet();
  }

  private getOrCreateSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const existing = spreadsheet.getSheetByName(CAPITAL_LEDGER_SHEET_NAME);
    if (existing) return existing;
    const sheet = spreadsheet.insertSheet(CAPITAL_LEDGER_SHEET_NAME);
    sheet
      .getRange(1, 1, 1, CAPITAL_LEDGER_HEADERS.length)
      .setValues([[...CAPITAL_LEDGER_HEADERS]])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, CAPITAL_LEDGER_HEADERS.length);
    return sheet;
  }
}
