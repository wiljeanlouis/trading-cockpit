import type { DashboardDto } from '@trading-cockpit/contracts';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { COCKPIT_THEME } from '../../../inbound/google-sheets/theme/theme';

const DASHBOARD_SHEET_NAME = 'Dashboard';

function formatTimestamp(
  date: Date,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): string {
  return Utilities.formatDate(date, spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function writeSection(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number, title: string): void {
  sheet.getRange(row, 1, 1, 9).merge().setValue(title).setFontWeight('bold').setFontSize(12);
}

function writeMetric(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  labelCell: string,
  valueRange: string,
  label: string,
  value: string | number | null,
  numberFormat = '0'
): void {
  sheet.getRange(labelCell).setValue(label).setFontWeight('bold');
  const range = sheet
    .getRange(valueRange)
    .merge()
    .setValue(value ?? '—')
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('right');
  if (typeof value === 'number') range.setNumberFormat(numberFormat);
}

function writeCard(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rangeA1: string,
  label: string,
  value: string | number | null,
  numberFormat?: string
): void {
  const range = sheet.getRange(rangeA1);
  const row = range.getRow();
  const column = range.getColumn();
  const columns = range.getNumColumns();
  sheet.getRange(row, column).setValue(label).setFontWeight('bold');
  const valueRange = sheet
    .getRange(row, column + 1, 1, columns - 1)
    .merge()
    .setValue(value ?? '—')
    .setHorizontalAlignment('right');
  if (numberFormat && typeof value === 'number') valueRange.setNumberFormat(numberFormat);
}

function writeTopMomentum(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  dashboard: DashboardDto
): void {
  const startRow = 17;
  const headers = ['Rank', 'Ticker', 'Score', 'Price', '52W High', 'Rel Volume', 'RSI', 'Review'];
  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (dashboard.topMomentum.length === 0) return;

  const rows = dashboard.topMomentum.map((candidate) => [
    candidate.rank,
    candidate.ticker,
    candidate.score,
    candidate.price,
    candidate.high52,
    candidate.relativeVolume,
    candidate.rsi,
    candidate.reviewStatus
  ]);
  sheet.getRange(startRow + 1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(startRow + 1, 4, rows.length, 1).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 5, rows.length, 1).setNumberFormat('0.00%');
}

function writeWatchlist(sheet: GoogleAppsScript.Spreadsheet.Sheet, dashboard: DashboardDto): void {
  const startRow = 26;
  const headers = [
    'Ticker',
    'Current',
    '90D Trend',
    'Signal',
    'Change',
    'Breakout',
    'Distance',
    'Setup',
    'Status'
  ];
  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (dashboard.watchlistPreview.length === 0) return;

  const rows = dashboard.watchlistPreview.map((entry) => [
    entry.ticker,
    entry.currentPrice,
    '',
    entry.signalPrice,
    entry.changeSinceSignal,
    entry.breakoutLevel,
    entry.distanceToBreakout,
    entry.setupStatus,
    entry.status
  ]);
  sheet.getRange(startRow + 1, 1, rows.length, headers.length).setValues(rows);

  dashboard.watchlistPreview.forEach((entry, index) => {
    if (!entry.ticker) return;
    const row = startRow + 1 + index;
    sheet
      .getRange(row, 3)
      .setFormula(
        `=SPARKLINE(INDEX(GOOGLEFINANCE("${entry.ticker}","close",TODAY()-90,TODAY()),0,2),` +
          `{"charttype","line";"linewidth",2})`
      );
  });

  sheet.getRange(startRow + 1, 2, rows.length, 1).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 4, rows.length, 1).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 5, rows.length, 1).setNumberFormat('0.00%');
  sheet.getRange(startRow + 1, 6, rows.length, 1).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 7, rows.length, 1).setNumberFormat('0.00%');
  for (let index = 0; index < rows.length; index += 1) sheet.setRowHeight(startRow + 1 + index, 32);
}

function writePositions(sheet: GoogleAppsScript.Spreadsheet.Sheet, dashboard: DashboardDto): void {
  const startRow = 35;
  const headers = ['Ticker', 'Entry', 'Current', 'Stop', 'Target', 'Quantity', 'P&L', 'P&L %'];
  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (dashboard.openPositionsPreview.length === 0) return;

  const rows = dashboard.openPositionsPreview.map((position) => [
    position.ticker,
    position.actualEntry,
    position.currentPrice,
    position.currentStop,
    position.target,
    position.actualQuantity,
    position.unrealizedPnl,
    position.unrealizedPnlPercent
  ]);
  sheet.getRange(startRow + 1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(startRow + 1, 2, rows.length, 4).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 7, rows.length, 1).setNumberFormat('$0.00');
  sheet.getRange(startRow + 1, 8, rows.length, 1).setNumberFormat('0.00%');
}

function writeActionSummary(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  label: string,
  count: number,
  background: string
): void {
  sheet
    .getRange(row, 11, 1, 3)
    .merge()
    .setValue(label)
    .setBackground(background)
    .setFontWeight('bold');
  sheet
    .getRange(row, 14)
    .setValue(count)
    .setBackground(background)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
}

function writeActionSection(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  title: string
): void {
  sheet
    .getRange(row, 11, 1, 4)
    .merge()
    .setValue(title)
    .setBackground(COCKPIT_THEME.blue)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold');
}

function writeNoAction(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  row: number,
  message: string
): void {
  sheet
    .getRange(row, 11, 1, 4)
    .merge()
    .setValue(message)
    .setFontColor(COCKPIT_THEME.gray)
    .setFontStyle('italic');
}

function writeActions(sheet: GoogleAppsScript.Spreadsheet.Sheet, dashboard: DashboardDto): void {
  const actions = dashboard.actions;
  sheet
    .getRange('K4:N4')
    .merge()
    .setValue('ACTION REQUIRED')
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  writeActionSummary(
    sheet,
    5,
    'NEAR BREAKOUT',
    actions.nearBreakout.length,
    actions.nearBreakout.length > 0 ? COCKPIT_THEME.lightGreen : COCKPIT_THEME.lightGray
  );
  writeActionSummary(
    sheet,
    6,
    'READY TO TRADE',
    actions.ready.length,
    actions.ready.length > 0 ? COCKPIT_THEME.lightGreen : COCKPIT_THEME.lightGray
  );
  writeActionSummary(
    sheet,
    7,
    'OPEN POSITIONS',
    actions.openPositions.length,
    actions.openPositions.length > 0 ? COCKPIT_THEME.lightBlue : COCKPIT_THEME.lightGray
  );

  writeActionSection(sheet, 9, 'NEAR BREAKOUT');
  let row = 10;
  if (actions.nearBreakout.length === 0) {
    writeNoAction(sheet, row, 'No candidate near breakout');
    row += 2;
  } else {
    actions.nearBreakout.slice(0, 5).forEach((action) => {
      sheet
        .getRange(row, 11, 1, 4)
        .setValues([[action.ticker, action.currentPrice, action.breakoutLevel, action.distance]]);
      sheet.getRange(row, 11).setFontWeight('bold');
      sheet.getRange(row, 12, 1, 2).setNumberFormat('$0.00');
      sheet.getRange(row, 14).setNumberFormat('0.00%');
      if (action.distance >= -0.01)
        sheet.getRange(row, 11, 1, 4).setBackground(COCKPIT_THEME.lightGreen);
      row += 1;
    });
    row += 1;
  }

  writeActionSection(sheet, row, 'READY TO TRADE');
  row += 1;
  if (actions.ready.length === 0) {
    writeNoAction(sheet, row, 'No setup ready');
    row += 2;
  } else {
    actions.ready.slice(0, 5).forEach((action) => {
      sheet
        .getRange(row, 11, 1, 4)
        .setValues([
          [action.ticker, action.currentPrice, action.breakoutLevel, action.setupStatus]
        ]);
      sheet.getRange(row, 11).setFontWeight('bold');
      sheet.getRange(row, 12, 1, 2).setNumberFormat('$0.00');
      sheet.getRange(row, 11, 1, 4).setBackground(COCKPIT_THEME.lightGreen);
      row += 1;
    });
    row += 1;
  }

  writeActionSection(sheet, row, 'OPEN POSITIONS');
  row += 1;
  if (actions.openPositions.length === 0) {
    writeNoAction(sheet, row, 'No open position');
  } else {
    actions.openPositions.slice(0, 5).forEach((action) => {
      sheet
        .getRange(row, 11, 1, 4)
        .setValues([
          [action.ticker, action.currentPrice, action.unrealizedPnlPercent, action.stopDistance]
        ]);
      sheet.getRange(row, 11).setFontWeight('bold');
      sheet.getRange(row, 12).setNumberFormat('$0.00');
      sheet.getRange(row, 13, 1, 2).setNumberFormat('0.00%');
      if (action.stopDistance !== null && action.stopDistance <= 0.01) {
        sheet.getRange(row, 11, 1, 4).setBackground(COCKPIT_THEME.lightRed);
      }
      row += 1;
    });
  }
}

function styleCard(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rangeA1: string,
  background: string
): void {
  sheet.getRange(rangeA1).setBackground(background).setBorder(true, true, true, true, false, false);
}

function applyAlternatingRows(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  endRow: number
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    sheet
      .getRange(row, 1, 1, 9)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        false,
        COCKPIT_THEME.border,
        SpreadsheetApp.BorderStyle.SOLID
      );
    if ((row - startRow) % 2 === 1) {
      sheet.getRange(row, 1, 1, 9).setBackground(COCKPIT_THEME.lightGray);
    }
  }
}

function applyDashboardTheme(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  sheet
    .getRange('A1:N45')
    .setFontFamily('Arial')
    .setFontColor(COCKPIT_THEME.text)
    .setVerticalAlignment('middle');
  sheet
    .getRange('A1:I1')
    .setBackground(COCKPIT_THEME.navy)
    .setFontColor(COCKPIT_THEME.white)
    .setFontWeight('bold')
    .setFontSize(20);
  sheet.getRange('A2:I2').setBackground(COCKPIT_THEME.navy).setFontColor('#CBD5E1').setFontSize(9);
  sheet.setRowHeight(1, 38);
  sheet.setRowHeight(2, 22);
  [4, 8, 12, 16, 25, 34].forEach((row) => {
    sheet
      .getRange(row, 1, 1, 9)
      .setBackground(COCKPIT_THEME.navy)
      .setFontColor(COCKPIT_THEME.white)
      .setFontWeight('bold');
    sheet.setRowHeight(row, 26);
  });
  ['A5:C6', 'D5:F6', 'G5:I6'].forEach((range) => styleCard(sheet, range, COCKPIT_THEME.lightBlue));
  ['A9:C10', 'D9:F10'].forEach((range) => styleCard(sheet, range, COCKPIT_THEME.lightGray));
  styleCard(sheet, 'G9:I10', COCKPIT_THEME.lightGreen);
  ['A13:C14', 'D13:F14', 'G13:I14'].forEach((range) =>
    styleCard(sheet, range, COCKPIT_THEME.lightGreen)
  );
  [17, 26, 35].forEach((row) => {
    sheet
      .getRange(row, 1, 1, 9)
      .setBackground(COCKPIT_THEME.blue)
      .setFontColor(COCKPIT_THEME.white)
      .setFontWeight('bold');
  });
  applyAlternatingRows(sheet, 18, 22);
  applyAlternatingRows(sheet, 27, 31);
  applyAlternatingRows(sheet, 36, 40);
  sheet.getRange('J1:J45').setBackground(COCKPIT_THEME.white);
  sheet.setHiddenGridlines(true);
}

export function projectDashboardToSheet(dashboard: DashboardDto): void {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME) ??
    spreadsheet.insertSheet(DASHBOARD_SHEET_NAME);
  sheet.getRange('A1:N50').breakApart();
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.getCharts().forEach((chart) => sheet.removeChart(chart));

  sheet
    .getRange('A1:I1')
    .merge()
    .setValue('TRADING COCKPIT')
    .setFontWeight('bold')
    .setFontSize(18)
    .setHorizontalAlignment('center');
  sheet
    .getRange('A2:I2')
    .merge()
    .setValue(`Last refresh: ${formatTimestamp(new Date(dashboard.generatedAt), spreadsheet)}`)
    .setHorizontalAlignment('center');

  writeSection(sheet, 4, 'ACCOUNT');
  writeCard(sheet, 'A5:C6', 'Account', dashboard.account.accountName);
  writeCard(sheet, 'D5:F6', 'Equity', dashboard.account.accountEquity, '$#,##0.00');
  writeCard(sheet, 'G5:I6', 'Currency', dashboard.account.currency);
  sheet.getRange('A6').setValue('Risk / Trade');
  sheet
    .getRange('B6:C6')
    .merge()
    .setValue(dashboard.account.defaultRiskPercent)
    .setNumberFormat('0.00%')
    .setHorizontalAlignment('right');
  sheet.getRange('D6').setValue('Max Position');
  sheet
    .getRange('E6:F6')
    .merge()
    .setValue(dashboard.account.maxPositionPercent)
    .setNumberFormat('0.00%')
    .setHorizontalAlignment('right');

  writeSection(sheet, 8, 'PIPELINE');
  writeMetric(sheet, 'A9', 'B9:C9', 'Signals', dashboard.pipeline.signals);
  writeMetric(sheet, 'D9', 'E9:F9', 'Watchlist', dashboard.pipeline.watchlist);
  writeMetric(sheet, 'G9', 'H9:I9', 'Ready', dashboard.pipeline.ready);
  writeMetric(sheet, 'A10', 'B10:C10', 'Trade Plans', dashboard.pipeline.activeTradePlans);
  writeMetric(sheet, 'D10', 'E10:F10', 'Open Positions', dashboard.pipeline.openPositions);
  writeMetric(sheet, 'G10', 'H10:I10', 'Closed Trades', dashboard.pipeline.closedTrades);

  writeSection(sheet, 12, 'PERFORMANCE');
  writeMetric(
    sheet,
    'A13',
    'B13:C13',
    'Realized P&L',
    dashboard.performance.realizedPnl,
    '$#,##0.00'
  );
  writeMetric(sheet, 'D13', 'E13:F13', 'Win Rate', dashboard.performance.winRate, '0.00%');
  writeMetric(sheet, 'G13', 'H13:I13', 'Trades', dashboard.performance.trades);
  writeMetric(sheet, 'A14', 'B14:C14', 'Average R', dashboard.performance.averageR, '0.00');
  writeMetric(sheet, 'D14', 'E14:F14', 'Total R', dashboard.performance.totalR, '0.00');
  writeMetric(sheet, 'G14', 'H14:I14', 'Wins', dashboard.performance.wins);

  writeSection(sheet, 16, 'TOP MOMENTUM CANDIDATES');
  writeTopMomentum(sheet, dashboard);
  writeSection(sheet, 25, 'WATCHLIST');
  writeWatchlist(sheet, dashboard);
  writeSection(sheet, 34, 'OPEN POSITIONS');
  writePositions(sheet, dashboard);
  writeActions(sheet, dashboard);

  [150, 120, 180, 150, 120, 120, 150, 120, 120, 25, 120, 110, 110, 130].forEach((width, index) =>
    sheet.setColumnWidth(index + 1, width)
  );
  applyDashboardTheme(sheet);
  sheet.setFrozenRows(2);
  spreadsheet.setActiveSheet(sheet);
  spreadsheet.toast('Dashboard mis à jour.', 'Trading Cockpit', 5);
}
