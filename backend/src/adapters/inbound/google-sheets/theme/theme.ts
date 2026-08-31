/**
 * ============================================================
 * TRADING COCKPIT THEME
 * ============================================================
 *
 * Thème visuel central du Trading Cockpit.
 *
 * Principes :
 *
 * - cellules toujours visuellement délimitées
 * - headers bleu marine
 * - tables blanches / gris très léger
 * - vert = positif / prêt
 * - orange = attention
 * - rouge = risque / perte
 * - bleu = information / structure
 *
 * Toute la présentation du classeur doit passer par ce fichier.
 */

const MOMENTUM_RANKING_SHEET = 'Momentum Ranking';

const WATCHLIST_SHEET = 'Watchlist';

const TRADE_PLANS_SHEET = 'Trade Plans';

const POSITIONS_SHEET = 'Positions';

const JOURNAL_SHEET = 'Journal';

const DASHBOARD_SHEET = 'Dashboard';

const ANALYTICS_SHEET = 'Analytics';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Range = GoogleAppsScript.Spreadsheet.Range;
type ConditionalFormatRule = GoogleAppsScript.Spreadsheet.ConditionalFormatRule;

export const COCKPIT_THEME = {
  navy: '#172554',
  blue: '#2563EB',
  lightBlue: '#EFF6FF',

  green: '#15803D',
  lightGreen: '#DCFCE7',

  red: '#B91C1C',
  lightRed: '#FEE2E2',

  orange: '#C2410C',
  lightOrange: '#FFEDD5',

  gray: '#64748B',
  lightGray: '#F8FAFC',
  alternateRow: '#F8FAFC',

  border: '#CBD5E1',
  borderStrong: '#94A3B8',

  white: '#FFFFFF',
  text: '#0F172A'
};

function requireColumn(headers: readonly unknown[], name: string): number {
  const expected = String(name).trim().toLowerCase();

  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Colonne absente : ${name}`);
  }

  return index;
}

function getSheetHeaders(sheet: Sheet): string[] {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((value) => String(value).trim());
}

/**
 * ============================================================
 * GLOBAL THEME
 * ============================================================
 */

export function applyCockpitTheme(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  themeDashboard(ss);
  themeAnalytics(ss);

  themeRanking(ss);
  themeWatchlist(ss);
  themeTradePlans(ss);
  themePositions(ss);
  themeJournal(ss);

  themeSimpleSheet(ss, 'Strategies');

  themeSimpleSheet(ss, 'Cockpit Config');

  themeSimpleSheet(ss, 'Momentum Score Config');

  themeSimpleSheet(ss, 'Finviz Screener');

  themeTechnicalSheet(ss, 'Lists');

  themeTechnicalSheet(ss, 'Signals History');

  ss.toast('Thème du cockpit appliqué.', 'Trading Cockpit', 5);
}

/**
 * ============================================================
 * COMMON
 * ============================================================
 */

function prepareSheet(sheet: Sheet | null): void {
  if (!sheet) {
    return;
  }

  /*
   * IMPORTANT
   *
   * On garde les gridlines visibles.
   *
   * Elles permettent de conserver la structure visuelle
   * du spreadsheet même hors des tables.
   */

  if (typeof sheet.setHiddenGridlines === 'function') {
    sheet.setHiddenGridlines(false);
  }

  if (typeof sheet.getDataRange !== 'function') {
    return;
  }

  const range = sheet.getDataRange();

  if (range) {
    range.setFontFamily('Arial').setFontColor(COCKPIT_THEME.text).setVerticalAlignment('middle');
  }
}

/**
 * Applique le style standard d'une table.
 *
 * Contrairement aux gridlines natives de Google Sheets,
 * les bordures restent clairement visibles même lorsqu'une
 * cellule possède une couleur de fond.
 */
function styleDataTable(
  sheet: Sheet | null,
  headerRow: number,
  startColumn: number,
  numberOfColumns: number
): void {
  if (!sheet) {
    return;
  }

  if (typeof sheet.getLastRow !== 'function' || typeof sheet.getRange !== 'function') {
    return;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < headerRow || numberOfColumns <= 0) {
    return;
  }

  const numberOfRows = lastRow - headerRow + 1;

  const tableRange = sheet.getRange(headerRow, startColumn, numberOfRows, numberOfColumns);

  /*
   * Bordures de toutes les cellules.
   */

  tableRange.setBorder(
    true,
    true,
    true,
    true,
    true,
    true,
    COCKPIT_THEME.border,
    SpreadsheetApp.BorderStyle.SOLID
  );

  /*
   * Fond standard des données.
   */

  if (lastRow > headerRow) {
    sheet
      .getRange(headerRow + 1, startColumn, lastRow - headerRow, numberOfColumns)
      .setBackground(COCKPIT_THEME.white);
  }

  /*
   * Header.
   */

  sheet
    .getRange(headerRow, startColumn, 1, numberOfColumns)
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      COCKPIT_THEME.borderStrong,
      SpreadsheetApp.BorderStyle.SOLID
    );

  sheet.setRowHeight(headerRow, 28);
}

/**
 * Alternance légère des lignes.
 */
function applyTableAlternatingRows(
  sheet: Sheet | null,
  startRow: number,
  endRow: number,
  startColumn: number,
  numberOfColumns: number
): void {
  if (!sheet || endRow < startRow) {
    return;
  }

  for (let row = startRow; row <= endRow; row++) {
    const background =
      (row - startRow) % 2 === 0 ? COCKPIT_THEME.white : COCKPIT_THEME.alternateRow;

    sheet.getRange(row, startColumn, 1, numberOfColumns).setBackground(background);
  }
}

/**
 * ============================================================
 * CONDITIONAL FORMATTING HELPERS
 * ============================================================
 */

function statusRule(
  range: Range,
  value: string,
  background: string,
  fontColor: string
): ConditionalFormatRule {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(value)
    .setBackground(background)
    .setFontColor(fontColor)
    .setRanges([range])
    .build();
}

function numericGreaterRule(
  range: Range,
  value: number,
  background: string,
  fontColor: string
): ConditionalFormatRule {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(value)
    .setBackground(background)
    .setFontColor(fontColor)
    .setRanges([range])
    .build();
}

function numericLessRule(
  range: Range,
  value: number,
  background: string,
  fontColor: string
): ConditionalFormatRule {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(value)
    .setBackground(background)
    .setFontColor(fontColor)
    .setRanges([range])
    .build();
}

/**
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

export function themeDashboard(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(DASHBOARD_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  sheet
    .getRange('A1:H1')
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setFontSize(20);

  sheet.getRange('A2:H2').setBackground(COCKPIT_THEME.navy).setFontColor('#CBD5E1');

  sheet.setRowHeight(1, 40);

  sheet.setRowHeight(2, 22);

  // ----------------------------------------------------------
  // SECTIONS
  // ----------------------------------------------------------

  [4, 8, 12, 16, 25, 34].forEach((row) => {
    sheet
      .getRange(row, 1, 1, 8)
      .setBackground(COCKPIT_THEME.navy)
      .setFontColor(COCKPIT_THEME.white)
      .setFontWeight('bold')
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        COCKPIT_THEME.borderStrong,
        SpreadsheetApp.BorderStyle.SOLID
      );

    sheet.setRowHeight(row, 27);
  });

  // ----------------------------------------------------------
  // ACCOUNT
  // ----------------------------------------------------------

  styleCard(sheet, 'A5:B6', COCKPIT_THEME.lightBlue);

  styleCard(sheet, 'D5:E6', COCKPIT_THEME.lightBlue);

  styleCard(sheet, 'G5:H6', COCKPIT_THEME.lightBlue);

  // ----------------------------------------------------------
  // PIPELINE
  // ----------------------------------------------------------

  styleCard(sheet, 'A9:B10', COCKPIT_THEME.lightGray);

  styleCard(sheet, 'D9:E10', COCKPIT_THEME.lightOrange);

  styleCard(sheet, 'G9:H10', COCKPIT_THEME.lightGreen);

  // ----------------------------------------------------------
  // PERFORMANCE
  // ----------------------------------------------------------

  styleCard(sheet, 'A13:B14', COCKPIT_THEME.lightGreen);

  styleCard(sheet, 'D13:E14', COCKPIT_THEME.lightGreen);

  styleCard(sheet, 'G13:H14', COCKPIT_THEME.lightGreen);

  // ----------------------------------------------------------
  // DASHBOARD TABLES
  // ----------------------------------------------------------

  styleDashboardTable(sheet, 17, 18, 22);

  styleDashboardTable(sheet, 26, 27, 31);

  styleDashboardTable(sheet, 35, 36, 40);
}

function styleDashboardTable(
  sheet: Sheet,
  headerRow: number,
  startDataRow: number,
  endDataRow: number
): void {
  sheet
    .getRange(headerRow, 1, 1, 8)
    .setBackground(COCKPIT_THEME.blue)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      COCKPIT_THEME.borderStrong,
      SpreadsheetApp.BorderStyle.SOLID
    );

  const range = sheet.getRange(startDataRow, 1, endDataRow - startDataRow + 1, 8);

  range.setBorder(
    true,
    true,
    true,
    true,
    true,
    true,
    COCKPIT_THEME.border,
    SpreadsheetApp.BorderStyle.SOLID
  );

  applyTableAlternatingRows(sheet, startDataRow, endDataRow, 1, 8);
}

function styleCard(sheet: Sheet, rangeA1: string, background: string): void {
  sheet
    .getRange(rangeA1)
    .setBackground(background)
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      COCKPIT_THEME.border,
      SpreadsheetApp.BorderStyle.SOLID
    );
}

/**
 * ============================================================
 * MOMENTUM RANKING
 * ============================================================
 */

export function themeRanking(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(MOMENTUM_RANKING_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    styleDataTable(sheet, 1, 1, lastColumn);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  applyTableAlternatingRows(sheet, 2, lastRow, 1, lastColumn);

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((value) => String(value).trim());

  const scoreColumn = requireColumn(headers, 'Momentum Score') + 1;

  const scoreRange = sheet.getRange(2, scoreColumn, lastRow - 1, 1);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(80)
      .setBackground(COCKPIT_THEME.lightGreen)
      .setFontColor(COCKPIT_THEME.green)
      .setRanges([scoreRange])
      .build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(65, 79.999)
      .setBackground(COCKPIT_THEME.lightOrange)
      .setFontColor(COCKPIT_THEME.orange)
      .setRanges([scoreRange])
      .build()
  ];

  sheet.setConditionalFormatRules(rules);
}

/**
 * ============================================================
 * WATCHLIST
 * ============================================================
 */

export function themeWatchlist(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(WATCHLIST_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  if (typeof sheet.getLastColumn !== 'function' || typeof sheet.getLastRow !== 'function') {
    return;
  }

  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    styleDataTable(sheet, 1, 1, lastColumn);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return;
  }

  applyTableAlternatingRows(sheet, 2, lastRow, 1, lastColumn);

  const headers = getSheetHeaders(sheet);

  const statusColumn = requireColumn(headers, 'Status') + 1;

  const range = sheet.getRange(2, statusColumn, lastRow - 1, 1);

  sheet.setConditionalFormatRules([
    statusRule(range, 'READY', COCKPIT_THEME.lightGreen, COCKPIT_THEME.green),

    statusRule(range, 'WATCHING', COCKPIT_THEME.lightOrange, COCKPIT_THEME.orange),

    statusRule(range, 'PLANNED', COCKPIT_THEME.lightBlue, COCKPIT_THEME.blue),

    statusRule(range, 'ENTERED', COCKPIT_THEME.lightBlue, COCKPIT_THEME.blue),

    statusRule(range, 'REJECTED', COCKPIT_THEME.lightRed, COCKPIT_THEME.red),

    statusRule(range, 'CLOSED', COCKPIT_THEME.lightGray, COCKPIT_THEME.gray)
  ]);
}

/**
 * ============================================================
 * TRADE PLANS
 * ============================================================
 */

export function themeTradePlans(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(TRADE_PLANS_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  if (typeof sheet.getLastColumn !== 'function' || typeof sheet.getLastRow !== 'function') {
    return;
  }

  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    styleDataTable(sheet, 1, 1, lastColumn);
  }

  if (sheet.getLastRow() > 1) {
    applyTableAlternatingRows(sheet, 2, sheet.getLastRow(), 1, lastColumn);
  }

  applyStatusColors(sheet, {
    DRAFT: [COCKPIT_THEME.lightOrange, COCKPIT_THEME.orange],

    READY: [COCKPIT_THEME.lightGreen, COCKPIT_THEME.green],

    EXECUTED: [COCKPIT_THEME.lightBlue, COCKPIT_THEME.blue],

    CANCELLED: [COCKPIT_THEME.lightRed, COCKPIT_THEME.red]
  });
}

/**
 * ============================================================
 * POSITIONS
 * ============================================================
 */

export function themePositions(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(POSITIONS_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    styleDataTable(sheet, 1, 1, lastColumn);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return;
  }

  applyTableAlternatingRows(sheet, 2, lastRow, 1, lastColumn);

  const headers = getSheetHeaders(sheet);

  const pnlColumn = requireColumn(headers, 'Unrealized P&L') + 1;

  const pnlRange = sheet.getRange(2, pnlColumn, lastRow - 1, 1);

  const statusColumn = requireColumn(headers, 'Status') + 1;

  const statusRange = sheet.getRange(2, statusColumn, lastRow - 1, 1);

  sheet.setConditionalFormatRules([
    numericGreaterRule(pnlRange, 0, COCKPIT_THEME.lightGreen, COCKPIT_THEME.green),

    numericLessRule(pnlRange, 0, COCKPIT_THEME.lightRed, COCKPIT_THEME.red),

    statusRule(statusRange, 'OPEN', COCKPIT_THEME.lightBlue, COCKPIT_THEME.blue),

    statusRule(statusRange, 'CLOSED', COCKPIT_THEME.lightGray, COCKPIT_THEME.gray),

    statusRule(statusRange, 'STOPPED', COCKPIT_THEME.lightRed, COCKPIT_THEME.red),

    statusRule(statusRange, 'TARGET HIT', COCKPIT_THEME.lightGreen, COCKPIT_THEME.green)
  ]);
}

/**
 * ============================================================
 * JOURNAL
 * ============================================================
 */

export function themeJournal(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(JOURNAL_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    styleDataTable(sheet, 1, 1, lastColumn);
  }

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return;
  }

  applyTableAlternatingRows(sheet, 2, lastRow, 1, lastColumn);

  const headers = getSheetHeaders(sheet);

  const outcomeColumn = requireColumn(headers, 'Outcome') + 1;

  const outcomeRange = sheet.getRange(2, outcomeColumn, lastRow - 1, 1);

  const rColumn = requireColumn(headers, 'R-Multiple') + 1;

  const rRange = sheet.getRange(2, rColumn, lastRow - 1, 1);

  sheet.setConditionalFormatRules([
    statusRule(outcomeRange, 'WIN', COCKPIT_THEME.lightGreen, COCKPIT_THEME.green),

    statusRule(outcomeRange, 'LOSS', COCKPIT_THEME.lightRed, COCKPIT_THEME.red),

    statusRule(outcomeRange, 'BREAKEVEN', COCKPIT_THEME.lightGray, COCKPIT_THEME.gray),

    numericGreaterRule(rRange, 0, COCKPIT_THEME.lightGreen, COCKPIT_THEME.green),

    numericLessRule(rRange, 0, COCKPIT_THEME.lightRed, COCKPIT_THEME.red)
  ]);
}

/**
 * ============================================================
 * ANALYTICS
 * ============================================================
 */

export function themeAnalytics(ss: Spreadsheet): void {
  const sheet = ss.getSheetByName(ANALYTICS_SHEET);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  sheet
    .getRange('A1:H1')
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setFontSize(20)
    .setHorizontalAlignment('center');

  sheet
    .getRange('A2:H2')
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor('#CBD5E1')
    .setHorizontalAlignment('center');

  [4, 8, 12, 17].forEach((row) => {
    sheet
      .getRange(row, 1, 1, 8)
      .setBackground(COCKPIT_THEME.navy)
      .setFontColor(COCKPIT_THEME.white)
      .setFontWeight('bold')
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        COCKPIT_THEME.borderStrong,
        SpreadsheetApp.BorderStyle.SOLID
      );
  });

  ['A5:B6', 'D5:E6', 'G5:H6'].forEach((range) => styleCard(sheet, range, COCKPIT_THEME.lightBlue));

  ['A9:B10', 'D9:E10', 'G9:H10'].forEach((range) =>
    styleCard(sheet, range, COCKPIT_THEME.lightGreen)
  );

  ['A13:B14', 'D13:E14', 'G13:H14'].forEach((range) =>
    styleCard(sheet, range, COCKPIT_THEME.lightBlue)
  );

  if (sheet.getLastRow() >= 18) {
    const numberOfColumns = Math.min(7, sheet.getLastColumn());

    styleDataTable(sheet, 18, 1, numberOfColumns);

    if (sheet.getLastRow() > 18) {
      applyTableAlternatingRows(sheet, 19, sheet.getLastRow(), 1, numberOfColumns);
    }
  }
}

/**
 * ============================================================
 * SIMPLE TABLES
 * ============================================================
 *
 * Strategies
 * Cockpit Config
 * Momentum Score Config
 * Finviz Screener
 */

export function themeSimpleSheet(ss: Spreadsheet, sheetName: string): void {
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  if (typeof sheet.getLastColumn !== 'function' || typeof sheet.getLastRow !== 'function') {
    return;
  }

  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return;
  }

  styleDataTable(sheet, 1, 1, lastColumn);

  if (sheet.getLastRow() > 1) {
    applyTableAlternatingRows(sheet, 2, sheet.getLastRow(), 1, lastColumn);
  }
}

/**
 * ============================================================
 * TECHNICAL / AUDIT TABLES
 * ============================================================
 */

export function themeTechnicalSheet(ss: Spreadsheet, sheetName: string): void {
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return;
  }

  prepareSheet(sheet);

  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return;
  }

  styleDataTable(sheet, 1, 1, lastColumn);

  if (sheet.getLastRow() > 1) {
    applyTableAlternatingRows(sheet, 2, sheet.getLastRow(), 1, lastColumn);
  }
}

/**
 * ============================================================
 * STATUS COLORS
 * ============================================================
 */

function applyStatusColors(sheet: Sheet, statuses: Record<string, [string, string]>): void {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return;
  }

  const headers = getSheetHeaders(sheet);

  const statusColumn = requireColumn(headers, 'Status') + 1;

  const range = sheet.getRange(2, statusColumn, lastRow - 1, 1);

  const rules = Object.entries(statuses).map(([status, colors]) =>
    statusRule(range, status, colors[0], colors[1])
  );

  sheet.setConditionalFormatRules(rules);
}
