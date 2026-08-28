const SHEET_NAME = 'Cockpit Config';

const PARAMETERS = {
  accountName: 'Account Name',
  accountEquity: 'Account Equity',
  defaultRiskPercent: 'Default Risk %',
  maxPositionPercent: 'Max Position %',
  currency: 'Currency'
} as const;

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
  if (lastRow < 4) throw new Error(`${SHEET_NAME} est vide.`);
  return mapLegacyCockpitConfiguration(sheet.getRange(4, 1, lastRow - 3, 2).getValues());
}

export function setupLegacyCockpitConfiguration(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet.getSheetByName(SHEET_NAME)) {
    spreadsheet.toast('Cockpit Config existe déjà.', 'Trading Cockpit', 5);
    return;
  }

  const sheet = spreadsheet.insertSheet(SHEET_NAME);
  const values = [
    ['TRADING COCKPIT CONFIG', '', ''],
    ['', '', ''],
    ['Parameter', 'Value', 'Description'],
    [PARAMETERS.accountName, 'Trading', 'Nom du compte utilisé pour le trading actif'],
    [PARAMETERS.accountEquity, 10000, 'Valeur actuelle du compte utilisée pour le position sizing'],
    [PARAMETERS.defaultRiskPercent, 0.005, 'Risque maximal par trade'],
    [PARAMETERS.maxPositionPercent, 0.1, 'Exposition maximale recommandée par position'],
    [PARAMETERS.currency, 'CAD', 'Devise du compte']
  ];
  sheet.getRange(1, 1, values.length, 3).setValues(values);
  sheet.getRange('A1:C1').merge().setFontWeight('bold').setFontSize(14);
  sheet.getRange('A3:C3').setFontWeight('bold');
  sheet.getRange('B5').setNumberFormat('$#,##0.00');
  sheet.getRange('B6').setNumberFormat('0.00%');
  sheet.getRange('B7').setNumberFormat('0.00%');
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, 3);
  spreadsheet.toast('Cockpit Config créé.', 'Trading Cockpit', 5);
}
