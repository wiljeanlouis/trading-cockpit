import type { CapitalTransaction } from '@trading-cockpit/backend-core/domain/capital-transaction';
import type { CapitalTransactionRepository } from '@trading-cockpit/backend-core/ports/outbound/capital-transaction-repository';
import {
  CAPITAL_LEDGER_HEADERS,
  capitalTransactionToRow,
  capitalTransactionsFromRowsForAccount
} from './capital-transaction-mapper';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { readSheetTable } from '../sheet-headers';

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
    const { headers, rows } = readSheetTable(sheet);
    const normalizedId = String(accountId || '')
      .trim()
      .toUpperCase();
    return capitalTransactionsFromRowsForAccount(headers, rows, normalizedId);
  }

  ensureReady(): void {
    this.getOrCreateSheet();
  }

  private getOrCreateSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheet = getTradingCockpitSpreadsheet();
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
