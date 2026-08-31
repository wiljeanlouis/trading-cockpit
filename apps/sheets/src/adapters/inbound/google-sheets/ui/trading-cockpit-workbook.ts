import { CAPITAL_LEDGER_HEADERS } from '../../../outbound/google-sheets/capital-transaction/capital-transaction-mapper';
import { SIGNALS_HISTORY_HEADERS } from '@trading-cockpit/contracts';
import {
  COCKPIT_CONFIG_HEADERS,
  COCKPIT_CONFIG_ROWS,
  COCKPIT_CONFIG_SHEET_NAME,
  hasCockpitConfigHeaders
} from '../../../outbound/google-sheets/cockpit-config/cockpit-configuration-sheet';
import { JOURNAL_HEADERS } from '../../../outbound/google-sheets/journal/journal-mapper';
import {
  refreshJournalValidations,
  validateJournalHeaders
} from '../../../outbound/google-sheets/journal/journal-sheet';
import {
  MOMENTUM_RANKING_HEADERS,
  MOMENTUM_RANKING_SHEET_NAME
} from '../../../outbound/google-sheets/momentum/momentum-ranking-schema';
import { POSITION_HEADERS } from '../../../outbound/google-sheets/position/position-mapper';
import {
  refreshPositionValidations,
  validatePositionsHeaders
} from '../../../outbound/google-sheets/position/position-sheet';
import {
  readSheetHeaders,
  requireSheetHeaders
} from '../../../outbound/google-sheets/sheet-headers';
import { TRADE_PLAN_HEADERS } from '../../../outbound/google-sheets/trade-plan/trade-plan-mapper';
import {
  refreshTradePlanValidations,
  validateTradePlansHeaders
} from '../../../outbound/google-sheets/trade-plan/trade-plan-sheet';
import { TRADING_ACCOUNT_HEADERS } from '../../../outbound/google-sheets/trading-account/trading-account-mapper';
import { GoogleSheetsTradingAccountRiskPolicyRepository } from '../../../outbound/google-sheets/trading-account/google-sheets-trading-account-risk-policy-repository';
import { WATCHLIST_HEADERS } from '../../../outbound/google-sheets/watchlist/watchlist-mapper';
import {
  refreshWatchlistValidations,
  validateWatchlistHeaders
} from '../../../outbound/google-sheets/watchlist/watchlist-sheet';
import {
  createMomentumRankingInSheets,
  createMomentumScoreConfigInSheets,
  MOMENTUM_SCORE_CONFIG_HEADERS,
  MOMENTUM_SCORE_CONFIG_VALUES
} from './setup-momentum-ranking';
import { setupStrategiesInSheets, STRATEGY_HEADERS } from './setup-strategies';

export type WorkbookSheetClassification =
  'DATA' | 'CONFIG' | 'TECHNICAL' | 'OPTIONAL_REPORT' | 'LEGACY_UNUSED';

export type WorkbookSetupStatus =
  | 'CREATED'
  | 'INITIALIZED'
  | 'ALREADY_VALID'
  | 'SKIPPED_OPTIONAL'
  | 'SCHEMA_MISMATCH'
  | 'FAILED'
  | 'MANUAL_CONFIGURATION';

export interface WorkbookSetupItem {
  sheetName: string;
  classification: WorkbookSheetClassification;
  status: WorkbookSetupStatus;
  message: string;
}

export interface WorkbookSetupReport {
  overallStatus: 'VALID' | 'INVALID';
  items: WorkbookSetupItem[];
  message: string;
}

interface TableSheetDefinition {
  sheetName: string;
  classification: WorkbookSheetClassification;
  headers: readonly string[];
  initialize: () => void;
  validateHeaders?: (headers: readonly unknown[]) => true;
  allowAdditionalHeaders?: boolean;
}

const SIGNALS_HISTORY_SHEET_NAME = 'Signals History';

const FINVIZ_MOMENTUM_SHEET_NAME = 'Finviz - Momentum';
const FINVIZ_MOMENTUM_HEADERS = [
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Refreshed At'
] as const;

const OPTIONAL_REPORT_SHEETS = ['Dashboard', 'Analytics', 'Documentation'] as const;
const LEGACY_UNUSED_SHEETS = ['Lists', 'Finviz Screener'] as const;

function tableDefinitions(): TableSheetDefinition[] {
  return [
    {
      sheetName: MOMENTUM_RANKING_SHEET_NAME,
      classification: 'DATA',
      headers: MOMENTUM_RANKING_HEADERS,
      initialize: createMomentumRankingInSheets,
      validateHeaders: (headers) =>
        requireSheetHeaders(headers, MOMENTUM_RANKING_HEADERS, MOMENTUM_RANKING_SHEET_NAME)
    },
    {
      sheetName: 'Watchlist',
      classification: 'DATA',
      headers: WATCHLIST_HEADERS,
      initialize: () => {
        initializeSimpleTable('Watchlist', WATCHLIST_HEADERS);
        refreshWatchlistValidations();
      },
      validateHeaders: validateWatchlistHeaders
    },
    {
      sheetName: 'Trade Plans',
      classification: 'DATA',
      headers: TRADE_PLAN_HEADERS,
      initialize: () => {
        const sheet = initializeSimpleTable('Trade Plans', TRADE_PLAN_HEADERS);
        refreshTradePlanValidations(sheet);
      },
      validateHeaders: validateTradePlansHeaders
    },
    {
      sheetName: 'Positions',
      classification: 'DATA',
      headers: POSITION_HEADERS,
      initialize: () => {
        const sheet = initializeSimpleTable('Positions', POSITION_HEADERS);
        refreshPositionValidations(sheet);
      },
      validateHeaders: validatePositionsHeaders
    },
    {
      sheetName: 'Journal',
      classification: 'DATA',
      headers: JOURNAL_HEADERS,
      initialize: () => {
        const sheet = initializeSimpleTable('Journal', JOURNAL_HEADERS);
        refreshJournalValidations(sheet);
      },
      validateHeaders: validateJournalHeaders
    },
    {
      sheetName: 'Capital Ledger',
      classification: 'DATA',
      headers: CAPITAL_LEDGER_HEADERS,
      initialize: () => initializeSimpleTable('Capital Ledger', CAPITAL_LEDGER_HEADERS)
    },
    {
      sheetName: SIGNALS_HISTORY_SHEET_NAME,
      classification: 'DATA',
      headers: SIGNALS_HISTORY_HEADERS,
      initialize: () => initializeSimpleTable(SIGNALS_HISTORY_SHEET_NAME, SIGNALS_HISTORY_HEADERS),
      validateHeaders: (headers) =>
        requireSheetHeaders(headers, SIGNALS_HISTORY_HEADERS, SIGNALS_HISTORY_SHEET_NAME)
    },
    {
      sheetName: 'Accounts',
      classification: 'CONFIG',
      headers: TRADING_ACCOUNT_HEADERS,
      initialize: initializeAccounts
    },
    {
      sheetName: 'Strategies',
      classification: 'CONFIG',
      headers: STRATEGY_HEADERS,
      initialize: setupStrategiesInSheets
    },
    {
      sheetName: COCKPIT_CONFIG_SHEET_NAME,
      classification: 'CONFIG',
      headers: COCKPIT_CONFIG_HEADERS,
      initialize: initializeCockpitConfig
    },
    {
      sheetName: FINVIZ_MOMENTUM_SHEET_NAME,
      classification: 'TECHNICAL',
      headers: FINVIZ_MOMENTUM_HEADERS,
      initialize: () => initializeSimpleTable(FINVIZ_MOMENTUM_SHEET_NAME, FINVIZ_MOMENTUM_HEADERS),
      allowAdditionalHeaders: true
    }
  ];
}

export function initializeTradingCockpitWorkbook(): WorkbookSetupReport {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const items: WorkbookSetupItem[] = [];

  for (const definition of tableDefinitions()) {
    items.push(initializeDefinition(spreadsheet, definition));
  }

  items.push(initializeMomentumScoreConfig(spreadsheet));
  items.push(...OPTIONAL_REPORT_SHEETS.map(skippedOptional));
  items.push(...LEGACY_UNUSED_SHEETS.map(skippedLegacy));
  items.push({
    sheetName: 'Accounts',
    classification: 'CONFIG',
    status: 'MANUAL_CONFIGURATION',
    message: 'Ajoute tes vrais comptes et Risk % Per Trade avant de créer de nouveaux Trade Plans.'
  });

  const report = buildReport(items);
  spreadsheet.toast(report.message, 'Trading Cockpit', 8);
  return report;
}

export function validateTradingCockpitWorkbook(): WorkbookSetupReport {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const items: WorkbookSetupItem[] = [];

  for (const definition of tableDefinitions()) {
    items.push(validateDefinition(spreadsheet, definition));
  }

  items.push(validateMomentumScoreConfig(spreadsheet));
  items.push(...OPTIONAL_REPORT_SHEETS.map(skippedOptional));
  items.push(...LEGACY_UNUSED_SHEETS.map(skippedLegacy));
  items.push({
    sheetName: 'Accounts',
    classification: 'CONFIG',
    status: 'MANUAL_CONFIGURATION',
    message: 'Structure valide; configure tes comptes réels si aucun compte n’est encore présent.'
  });

  const report = buildReport(items);
  spreadsheet.toast(report.message, 'Trading Cockpit', 8);
  return report;
}

function initializeDefinition(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  definition: TableSheetDefinition
): WorkbookSetupItem {
  const sheet = spreadsheet.getSheetByName(definition.sheetName);
  if (!sheet) {
    definition.initialize();
    return {
      sheetName: definition.sheetName,
      classification: definition.classification,
      status: 'CREATED',
      message: `${definition.sheetName} créé avec le schéma canonique.`
    };
  }
  if (isContentEmpty(sheet)) {
    definition.initialize();
    return {
      sheetName: definition.sheetName,
      classification: definition.classification,
      status: 'INITIALIZED',
      message: `${definition.sheetName} initialisé avec le schéma canonique.`
    };
  }

  const validation = validateDefinition(spreadsheet, definition);
  if (validation.status !== 'ALREADY_VALID') return validation;

  return preserveCanonicalSheet(definition);
}

function validateDefinition(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  definition: TableSheetDefinition
): WorkbookSetupItem {
  const sheet = spreadsheet.getSheetByName(definition.sheetName);
  if (!sheet) {
    return {
      sheetName: definition.sheetName,
      classification: definition.classification,
      status: 'FAILED',
      message: `${definition.sheetName} est absent.`
    };
  }
  if (isContentEmpty(sheet)) {
    return {
      sheetName: definition.sheetName,
      classification: definition.classification,
      status: 'FAILED',
      message: `${definition.sheetName} est vide.`
    };
  }

  try {
    const headers = readSheetHeaders(sheet);
    requireExactHeaders(
      definition.sheetName,
      headers,
      definition.headers,
      Boolean(definition.allowAdditionalHeaders)
    );
    definition.validateHeaders?.(headers);
    validateRequiredRows(definition.sheetName, sheet);
    return preserveCanonicalSheet(definition);
  } catch (error) {
    return {
      sheetName: definition.sheetName,
      classification: definition.classification,
      status: 'SCHEMA_MISMATCH',
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function preserveCanonicalSheet(definition: TableSheetDefinition): WorkbookSetupItem {
  return {
    sheetName: definition.sheetName,
    classification: definition.classification,
    status: 'ALREADY_VALID',
    message: `${definition.sheetName} est déjà canonique; données préservées.`
  };
}

function initializeSimpleTable(
  sheetName: string,
  headers: readonly string[]
): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) ?? spreadsheet.insertSheet(sheetName);
  sheet.clear();
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([[...headers]])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function initializeAccounts(): void {
  initializeSimpleTable('Accounts', TRADING_ACCOUNT_HEADERS);
  new GoogleSheetsTradingAccountRiskPolicyRepository().ensureReady();
}

function initializeCockpitConfig(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(COCKPIT_CONFIG_SHEET_NAME) ??
    spreadsheet.insertSheet(COCKPIT_CONFIG_SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, 1 + COCKPIT_CONFIG_ROWS.length, 3)
    .setValues([[...COCKPIT_CONFIG_HEADERS], ...COCKPIT_CONFIG_ROWS]);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.getRange('B3').setNumberFormat('$#,##0.00');
  sheet.getRange('B4').setNumberFormat('0.00%');
  sheet.getRange('B5').setNumberFormat('0.00%');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

function initializeMomentumScoreConfig(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): WorkbookSetupItem {
  const sheet = spreadsheet.getSheetByName('Momentum Score Config');
  if (!sheet) {
    createMomentumScoreConfigInSheets();
    return created('Momentum Score Config', 'CONFIG');
  }
  if (isContentEmpty(sheet)) {
    createMomentumScoreConfigInSheets();
    return initialized('Momentum Score Config', 'CONFIG');
  }
  return validateMomentumScoreConfig(spreadsheet);
}

function validateMomentumScoreConfig(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): WorkbookSetupItem {
  const sheet = spreadsheet.getSheetByName('Momentum Score Config');
  if (!sheet) return failed('Momentum Score Config', 'CONFIG', 'Momentum Score Config est absent.');
  if (isContentEmpty(sheet))
    return failed('Momentum Score Config', 'CONFIG', 'Momentum Score Config est vide.');
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();
  const headers = (values[0] ?? []).map((value) => String(value || '').trim());
  const rows = values.slice(1);
  const hasCanonicalHeaders = MOMENTUM_SCORE_CONFIG_HEADERS.every(
    (header, index) => headers[index] === header
  );
  const hasExpectedRecords =
    rows.length === MOMENTUM_SCORE_CONFIG_VALUES.length &&
    rows.every((row, rowIndex) =>
      MOMENTUM_SCORE_CONFIG_VALUES[rowIndex].every(
        (value, columnIndex) => row[columnIndex] === value
      )
    );
  if (!hasCanonicalHeaders || !hasExpectedRecords || rows.some(isBlankRow)) {
    return {
      sheetName: 'Momentum Score Config',
      classification: 'CONFIG',
      status: 'SCHEMA_MISMATCH',
      message:
        'Momentum Score Config doit utiliser Component / Condition / Points / Max en ligne 1.'
    };
  }
  return preserveCanonicalSheet({
    sheetName: 'Momentum Score Config',
    classification: 'CONFIG',
    headers: [],
    initialize: createMomentumScoreConfigInSheets
  });
}

function isBlankRow(row: readonly unknown[]): boolean {
  return row.every((value) => !String(value || '').trim());
}

function validateRequiredRows(sheetName: string, sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  if (sheetName === 'Strategies' && sheet.getLastRow() < 2) {
    throw new Error('Strategies doit contenir au moins la stratégie MOMENTUM_BREAKOUT.');
  }
  if (sheetName === COCKPIT_CONFIG_SHEET_NAME) {
    const headers = readSheetHeaders(sheet);
    if (!hasCockpitConfigHeaders(headers)) {
      throw new Error('Cockpit Config doit utiliser Parameter / Value / Description en ligne 1.');
    }
    const rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
    const keys = new Set(rows.map((row) => String(row[0] || '').trim()).filter(Boolean));
    for (const [parameter] of COCKPIT_CONFIG_ROWS) {
      if (!keys.has(parameter)) throw new Error(`Cockpit Config paramètre absent : ${parameter}`);
    }
  }
}

function requireExactHeaders(
  sheetName: string,
  headers: readonly unknown[],
  expected: readonly string[],
  allowAdditionalHeaders = false
): void {
  const normalized = headers.map((value) => String(value || '').trim());
  const actualComparable = normalized.slice(0, expected.length);
  const nonEmptyExtraHeaders = allowAdditionalHeaders
    ? []
    : normalized.slice(expected.length).filter(Boolean);
  if (
    actualComparable.length !== expected.length ||
    actualComparable.some((v, i) => v !== expected[i]) ||
    nonEmptyExtraHeaders.length > 0
  ) {
    throw new Error(`${sheetName} doit avoir ses en-têtes canoniques en ligne 1.`);
  }
}

function isContentEmpty(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow === 0 || lastColumn === 0) return true;
  return sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getValues()
    .flat()
    .every((value) => !String(value || '').trim());
}

function created(
  sheetName: string,
  classification: WorkbookSheetClassification
): WorkbookSetupItem {
  return {
    sheetName,
    classification,
    status: 'CREATED',
    message: `${sheetName} créé avec le schéma canonique.`
  };
}

function initialized(
  sheetName: string,
  classification: WorkbookSheetClassification
): WorkbookSetupItem {
  return {
    sheetName,
    classification,
    status: 'INITIALIZED',
    message: `${sheetName} initialisé avec le schéma canonique.`
  };
}

function failed(
  sheetName: string,
  classification: WorkbookSheetClassification,
  message: string
): WorkbookSetupItem {
  return { sheetName, classification, status: 'FAILED', message };
}

function skippedOptional(sheetName: string): WorkbookSetupItem {
  return {
    sheetName,
    classification: 'OPTIONAL_REPORT',
    status: 'SKIPPED_OPTIONAL',
    message: `${sheetName} est un rapport optionnel généré; non requis pour la structure DATA.`
  };
}

function skippedLegacy(sheetName: string): WorkbookSetupItem {
  return {
    sheetName,
    classification: 'LEGACY_UNUSED',
    status: 'SKIPPED_OPTIONAL',
    message: `${sheetName} n’est pas recréé par le setup canonique.`
  };
}

function buildReport(items: WorkbookSetupItem[]): WorkbookSetupReport {
  const invalid = items.filter((item) => ['SCHEMA_MISMATCH', 'FAILED'].includes(item.status));
  const overallStatus = invalid.length > 0 ? 'INVALID' : 'VALID';
  return {
    overallStatus,
    items,
    message:
      overallStatus === 'VALID'
        ? 'Trading Cockpit workbook VALID.'
        : `Trading Cockpit workbook INVALID (${invalid.length} problème(s)).`
  };
}
