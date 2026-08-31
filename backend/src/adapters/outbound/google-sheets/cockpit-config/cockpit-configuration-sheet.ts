import { isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Cockpit Config';
const COCKPIT_CONFIG_HEADERS = ['Parameter', 'Value', 'Description'] as const;

const PARAMETERS = {
  accountName: 'Account Name',
  accountEquity: 'Account Equity',
  defaultRiskPercent: 'Default Risk %',
  maxPositionPercent: 'Max Position %',
  currency: 'Currency'
} as const;

const COCKPIT_CONFIG_ROWS: Array<[string, string | number, string]> = [
  [PARAMETERS.accountName, 'Trading', 'Nom du compte utilisé pour le trading actif'],
  [PARAMETERS.accountEquity, 10000, 'Valeur actuelle du compte utilisée pour le position sizing'],
  [PARAMETERS.defaultRiskPercent, 0.005, 'Risque maximal par trade'],
  [PARAMETERS.maxPositionPercent, 0.1, 'Exposition maximale recommandée par position'],
  [PARAMETERS.currency, 'CAD', 'Devise du compte']
];

export interface LegacyCockpitConfiguration {
  accountName: string;
  accountEquity: number;
  defaultRiskPercent: number;
  maxPositionPercent: number;
  currency: string;
}

export function mapLegacyCockpitConfiguration(
  rows: readonly (readonly unknown[])[]
): LegacyCockpitConfiguration {
  const values = new Map<string, unknown>();
  rows.forEach((row) => {
    const key = String(row[0] || '').trim();
    if (key) values.set(key, row[1]);
  });

  const accountName = String(values.get(PARAMETERS.accountName) || '').trim();
  const accountEquity = Number(values.get(PARAMETERS.accountEquity));
  const defaultRiskPercent = Number(values.get(PARAMETERS.defaultRiskPercent));
  const maxPositionPercent = Number(values.get(PARAMETERS.maxPositionPercent));
  const currency = String(values.get(PARAMETERS.currency) || '')
    .trim()
    .toUpperCase();

  if (!accountName) throw new Error('Account Name est obligatoire.');
  if (!Number.isFinite(accountEquity) || accountEquity <= 0) {
    throw new Error('Account Equity doit être supérieur à 0.');
  }
  if (!Number.isFinite(defaultRiskPercent) || defaultRiskPercent <= 0 || defaultRiskPercent > 1) {
    throw new Error('Default Risk % doit être compris entre 0% et 100%.');
  }
  if (!Number.isFinite(maxPositionPercent) || maxPositionPercent <= 0 || maxPositionPercent > 1) {
    throw new Error('Max Position % doit être compris entre 0% et 100%.');
  }
  if (!currency) throw new Error('Currency est obligatoire.');

  return { accountName, accountEquity, defaultRiskPercent, maxPositionPercent, currency };
}

export function readLegacyCockpitConfiguration(): LegacyCockpitConfiguration {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(`${SHEET_NAME} est absent. Exécute d'abord Setup Cockpit Config.`);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error(`${SHEET_NAME} est vide.`);
  const headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), COCKPIT_CONFIG_HEADERS.length))
    .getValues()[0]
    .map((value) => String(value || '').trim());
  if (!hasCockpitConfigHeaders(headers)) {
    throw new Error(`${SHEET_NAME} utilise un ancien schéma. Colonne absente : Parameter`);
  }
  return mapLegacyCockpitConfiguration(sheet.getRange(2, 1, lastRow - 1, 2).getValues());
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
  const values = [[...COCKPIT_CONFIG_HEADERS], ...COCKPIT_CONFIG_ROWS];
  sheet.getRange(1, 1, values.length, 3).setValues(values);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.getRange('B3').setNumberFormat('$#,##0.00');
  sheet.getRange('B4').setNumberFormat('0.00%');
  sheet.getRange('B5').setNumberFormat('0.00%');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
  spreadsheet.toast('Cockpit Config créé.', 'Trading Cockpit', 5);
}

export interface CockpitConfigMigrationResult {
  status: 'ALREADY_NORMALIZED' | 'MIGRATED' | 'REFUSED_UNEXPECTED_LAYOUT';
  preservedRecords: number;
  message: string;
}

export function migrateCockpitConfigToDataSheet(): CockpitConfigMigrationResult {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`${SHEET_NAME} est absent. Exécute d'abord Setup Cockpit Config.`);
  const result = migrateCockpitConfigSheet(sheet);
  spreadsheet.toast(result.message, 'Trading Cockpit', 7);
  return result;
}

export function migrateCockpitConfigSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): CockpitConfigMigrationResult {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), COCKPIT_CONFIG_HEADERS.length);
  const row1 = readConfigRow(sheet, 1, lastColumn);
  if (hasCockpitConfigHeaders(row1)) {
    return {
      status: 'ALREADY_NORMALIZED',
      preservedRecords: Math.max(lastRow - 1, 0),
      message: 'Cockpit Config est déjà normalisé.'
    };
  }
  if (lastRow < 4) return refusedConfig();
  const row3 = readConfigRow(sheet, 3, lastColumn);
  if (!hasCockpitConfigHeaders(row3)) return refusedConfig();

  const rows = sheet.getRange(4, 1, lastRow - 3, 3).getValues();
  const meaningfulRows = rows.filter((row) => String(row[0] || '').trim());
  sheet.clear();
  sheet
    .getRange(1, 1, 1 + meaningfulRows.length, 3)
    .setValues([[...COCKPIT_CONFIG_HEADERS], ...meaningfulRows]);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.getRange('B3').setNumberFormat('$#,##0.00');
  sheet.getRange('B4').setNumberFormat('0.00%');
  sheet.getRange('B5').setNumberFormat('0.00%');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
  return {
    status: 'MIGRATED',
    preservedRecords: meaningfulRows.length,
    message: `Cockpit Config normalisé. ${meaningfulRows.length} paramètre(s) préservé(s).`
  };
}

function hasCockpitConfigHeaders(headers: readonly string[]): boolean {
  return COCKPIT_CONFIG_HEADERS.every((header, index) => headers[index] === header);
}

function readConfigRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  columns: number
): string[] {
  return sheet
    .getRange(row, 1, 1, columns)
    .getValues()[0]
    .map((value) => String(value || '').trim());
}

function refusedConfig(): CockpitConfigMigrationResult {
  return {
    status: 'REFUSED_UNEXPECTED_LAYOUT',
    preservedRecords: 0,
    message:
      'Cockpit Config possède un layout inattendu. Migration refusée pour éviter de perdre des données.'
  };
}
