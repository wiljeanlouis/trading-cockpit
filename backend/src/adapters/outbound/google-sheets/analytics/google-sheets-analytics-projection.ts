import type {
  AnalyticsDto,
  AnalyticsStrategyRowDto,
  AnalyticsStrategyVersionRowDto
} from '@trading-cockpit/contracts';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { themeAnalytics } from '../../../inbound/google-sheets/theme/theme';

const ANALYTICS_SHEET_NAME = 'Analytics';

function writeSection(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number, title: string): void {
  sheet.getRange(row, 1, 1, 8).merge().setValue(title);
}

function writeMetric(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  labelCell: string,
  valueCell: string,
  label: string,
  value: number | null,
  numberFormat = '0'
): void {
  sheet.getRange(labelCell).setValue(label).setFontWeight('bold');
  const range = sheet.getRange(valueCell);
  if (value === null || value === undefined) {
    range.setValue('—');
    return;
  }
  range.setValue(value).setFontWeight('bold').setFontSize(12).setNumberFormat(numberFormat);
}

function writeStrategyAnalytics(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  strategies: readonly AnalyticsStrategyRowDto[]
): void {
  const headers = [
    'Strategy ID',
    'Strategy',
    'Trades',
    'Wins',
    'Win Rate',
    'Total P&L',
    'Average R',
    'Total R'
  ];
  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]);
  if (strategies.length === 0) return;

  const values = strategies.map((strategy) => [
    strategy.strategyId,
    strategy.strategy,
    strategy.trades,
    strategy.wins,
    strategy.winRate,
    strategy.totalPnl,
    strategy.averageR,
    strategy.totalR
  ]);
  sheet.getRange(startRow + 1, 1, values.length, headers.length).setValues(values);
  sheet.getRange(startRow + 1, 5, values.length, 1).setNumberFormat('0.00%');
  sheet.getRange(startRow + 1, 6, values.length, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(startRow + 1, 7, values.length, 2).setNumberFormat('0.00');
}

function writeStrategyVersionAnalytics(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  strategies: readonly AnalyticsStrategyVersionRowDto[]
): void {
  const headers = [
    'Strategy ID',
    'Strategy',
    'Version',
    'Trades',
    'Wins',
    'Win Rate',
    'Total P&L',
    'Average R',
    'Total R'
  ];
  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]);
  if (strategies.length === 0) return;

  const values = strategies.map((strategy) => [
    strategy.strategyId,
    strategy.strategy,
    strategy.version,
    strategy.trades,
    strategy.wins,
    strategy.winRate,
    strategy.totalPnl,
    strategy.averageR,
    strategy.totalR
  ]);
  sheet.getRange(startRow + 1, 1, values.length, headers.length).setValues(values);
  sheet.getRange(startRow + 1, 6, values.length, 1).setNumberFormat('0.00%');
  sheet.getRange(startRow + 1, 7, values.length, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(startRow + 1, 8, values.length, 2).setNumberFormat('0.00');
}

export function projectAnalyticsToSheet(analytics: AnalyticsDto): void {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const sheet =
    spreadsheet.getSheetByName(ANALYTICS_SHEET_NAME) ??
    spreadsheet.insertSheet(ANALYTICS_SHEET_NAME);

  sheet.getRange('A1:M150').breakApart();
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.getCharts().forEach((chart) => sheet.removeChart(chart));

  sheet.getRange('A1:H1').merge().setValue('TRADING ANALYTICS');
  sheet.getRange('A2:H2').merge().setValue(`Based on ${analytics.summary.trades} closed trade(s)`);

  writeSection(sheet, 4, 'PERFORMANCE');
  writeMetric(sheet, 'A5', 'B5', 'Trades', analytics.summary.trades);
  writeMetric(sheet, 'D5', 'E5', 'Win Rate', analytics.summary.winRate, '0.00%');
  writeMetric(sheet, 'G5', 'H5', 'Profit Factor', analytics.summary.profitFactor, '0.00');
  writeMetric(sheet, 'A6', 'B6', 'Wins', analytics.summary.wins);
  writeMetric(sheet, 'D6', 'E6', 'Losses', analytics.summary.losses);
  writeMetric(sheet, 'G6', 'H6', 'Breakeven', analytics.summary.breakeven);

  writeSection(sheet, 8, 'PROFIT & LOSS');
  writeMetric(sheet, 'A9', 'B9', 'Total P&L', analytics.summary.totalPnl, '$#,##0.00');
  writeMetric(sheet, 'D9', 'E9', 'Average P&L', analytics.summary.averagePnl, '$#,##0.00');
  writeMetric(sheet, 'G9', 'H9', 'Best Trade', analytics.summary.bestPnl, '$#,##0.00');
  writeMetric(sheet, 'A10', 'B10', 'Gross Profit', analytics.summary.grossProfit, '$#,##0.00');
  writeMetric(sheet, 'D10', 'E10', 'Gross Loss', analytics.summary.grossLoss, '$#,##0.00');
  writeMetric(sheet, 'G10', 'H10', 'Worst Trade', analytics.summary.worstPnl, '$#,##0.00');

  writeSection(sheet, 12, 'R-MULTIPLE');
  writeMetric(sheet, 'A13', 'B13', 'Total R', analytics.summary.totalR, '0.00');
  writeMetric(sheet, 'D13', 'E13', 'Average R', analytics.summary.averageR, '0.00');
  writeMetric(sheet, 'G13', 'H13', 'Expectancy', analytics.summary.expectancyR, '0.00');
  writeMetric(sheet, 'A14', 'B14', 'Average Winner', analytics.summary.averageWinnerR, '0.00');
  writeMetric(sheet, 'D14', 'E14', 'Average Loser', analytics.summary.averageLoserR, '0.00');
  writeMetric(sheet, 'G14', 'H14', 'Best R', analytics.summary.bestR, '0.00');

  writeSection(sheet, 17, 'PERFORMANCE BY STRATEGY');
  writeStrategyAnalytics(sheet, 18, analytics.byStrategy);

  const versionSectionRow = 21 + analytics.byStrategy.length;
  writeSection(sheet, versionSectionRow, 'PERFORMANCE BY STRATEGY VERSION');
  writeStrategyVersionAnalytics(sheet, versionSectionRow + 1, analytics.byStrategyVersion);

  sheet.setFrozenRows(2);
  for (let column = 1; column <= 8; column += 1) {
    sheet.setColumnWidth(column, column % 3 === 1 ? 150 : 110);
  }

  themeAnalytics(spreadsheet);
  spreadsheet.setActiveSheet(sheet);
  spreadsheet.toast('Analytics mis à jour.', 'Trading Cockpit', 5);
}
