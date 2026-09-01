import { isSheetEffectivelyEmpty } from '../data-sheet';
import type { TradingConfigDto } from '@trading-cockpit/contracts';

const SHEET_NAME = 'Cockpit Config';
export const COCKPIT_CONFIG_SHEET_NAME = SHEET_NAME;
export const COCKPIT_CONFIG_HEADERS = ['Parameter', 'Value', 'Description'] as const;

export function mapLegacyCockpitConfiguration(
  rows: readonly (readonly unknown[])[]
): TradingConfigDto {
  return {
    settings: rows
      .map((row) => ({
        parameter: String(row[0] || '').trim(),
        value: row[1] === undefined || row[1] === '' ? null : (row[1] as string | number | boolean),
        description: String(row[2] || '').trim()
      }))
      .filter((setting) => setting.parameter)
  };
}

export function readLegacyCockpitConfiguration(): TradingConfigDto {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(
      `${SHEET_NAME} est absent. Exécute d'abord Initialize Trading Cockpit depuis le menu Setup.`
    );
  }
  const lastRow = sheet.getLastRow();
  const headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), COCKPIT_CONFIG_HEADERS.length))
    .getValues()[0]
    .map((value) => String(value || '').trim());
  if (!hasCockpitConfigHeaders(headers)) {
    throw new Error(`${SHEET_NAME} utilise un ancien schéma. Colonne absente : Parameter`);
  }
  if (lastRow < 2) return { settings: [] };
  return mapLegacyCockpitConfiguration(sheet.getRange(2, 1, lastRow - 1, 3).getValues());
}

export function setupLegacyCockpitConfiguration(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing && !isSheetEffectivelyEmpty(existing)) {
    spreadsheet.toast('Cockpit Config existe déjà.', 'Trading Cockpit', 5);
    return;
  }

  const sheet = existing ?? spreadsheet.insertSheet(SHEET_NAME);
  sheet.clear();
  const values = [[...COCKPIT_CONFIG_HEADERS]];
  sheet.getRange(1, 1, values.length, 3).setValues(values);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
  spreadsheet.toast('Cockpit Config créé.', 'Trading Cockpit', 5);
}

export function hasCockpitConfigHeaders(headers: readonly string[]): boolean {
  return COCKPIT_CONFIG_HEADERS.every((header, index) => headers[index] === header);
}
