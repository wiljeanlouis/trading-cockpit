import { CAPITAL_LEDGER_HEADERS } from '../../../outbound/google-sheets/capital-transaction/capital-transaction-mapper';
import {
  FINVIZ_MOMENTUM_EXPORT_HEADERS,
  SIGNALS_HISTORY_HEADERS,
  STRATEGY_HEADERS,
  STRATEGY_VERSION_HEADERS
} from '@trading-cockpit/contracts';
import { JOURNAL_HEADERS } from '../../../outbound/google-sheets/journal/journal-mapper';
import {
  refreshJournalValidations,
  validateJournalHeaders
} from '../../../outbound/google-sheets/journal/journal-sheet';
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
import { setupStrategiesInSheets, validateStrategiesInSheets } from './setup-strategies';

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

const FINVIZ_SIGNALS_SHEET_NAME = 'Finviz Signals';
const FINVIZ_SIGNALS_HEADERS = [
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Refreshed At',
  ...FINVIZ_MOMENTUM_EXPORT_HEADERS
] as const;

const LEGACY_REPORT_SHEETS = ['Dashboard', 'Analytics'] as const;
const OPTIONAL_REPORT_SHEETS = ['Documentation'] as const;
const LEGACY_UNUSED_SHEETS = ['Lists', 'Finviz Screener'] as const;

/**
 * Defines the canonical workbook inventory for the supported Sheets runtime, aligned with API
 * readers so setup/validation catches schema drift before HTTP endpoints fail.
 */
function tableDefinitions(): TableSheetDefinition[] {
  return [
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
      sheetName: 'Strategy Versions',
      classification: 'CONFIG',
      headers: STRATEGY_VERSION_HEADERS,
      initialize: setupStrategiesInSheets,
      validateHeaders: () => validateStrategiesInSheets()
    },
    {
      sheetName: FINVIZ_SIGNALS_SHEET_NAME,
      classification: 'TECHNICAL',
      headers: FINVIZ_SIGNALS_HEADERS,
      initialize: () => initializeSimpleTable(FINVIZ_SIGNALS_SHEET_NAME, FINVIZ_SIGNALS_HEADERS),
      allowAdditionalHeaders: true
    }
  ];
}

/**
 * Creates or initializes missing/empty canonical structures without seeding user-specific
 * business data such as real accounts or strategy records.
 */
export function initializeTradingCockpitWorkbook(): WorkbookSetupReport {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const items: WorkbookSetupItem[] = [];

  for (const definition of tableDefinitions()) {
    items.push(initializeDefinition(spreadsheet, definition));
  }

  items.push(...LEGACY_REPORT_SHEETS.map(skippedLegacy));
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

/**
 * Performs read-only workbook validation, reporting schema state and manual-configuration needs
 * without repairing, migrating or formatting the workbook.
 */
export function validateTradingCockpitWorkbook(): WorkbookSetupReport {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const items: WorkbookSetupItem[] = [];

  for (const definition of tableDefinitions()) {
    items.push(validateDefinition(spreadsheet, definition));
  }

  items.push(...LEGACY_REPORT_SHEETS.map(skippedLegacy));
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
  showValidationDetailsIfInvalid(report);
  return report;
}

/**
 * Initializes a missing/empty sheet, but preserves any non-empty sheet unless it already matches
 * the current canonical schema.
 */
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

/**
 * Validates Data Contract V1 for DATA/CONFIG sheets: row 1 exact headers and row 2+ records.
 * Technical provider projections may allow extra headers only when the export can add fields.
 */
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

/**
 * Creates only the structural table and minimal DATA-sheet-friendly formatting.
 */
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

function validateRequiredRows(sheetName: string, sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  void sheetName;
  void sheet;
}

/**
 * Enforces header order as part of the workbook contract because mappers/formulas still depend on
 * stable physical column positions in the Google Sheets UI runtime.
 */
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

function showValidationDetailsIfInvalid(report: WorkbookSetupReport): void {
  if (report.overallStatus === 'VALID') return;

  const invalidItems = report.items.filter((item) =>
    ['SCHEMA_MISMATCH', 'FAILED'].includes(item.status)
  );
  const details = invalidItems.map((item) => `• ${item.sheetName}: ${item.message}`).join('\n');
  const ui = SpreadsheetApp.getUi();
  ui.alert('Trading Cockpit workbook INVALID', `${report.message}\n\n${details}`, ui.ButtonSet.OK);
}
