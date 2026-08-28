/* global getTradingConfig */

/**
 * ============================================================
 * DASHBOARD
 * ============================================================
 *
 * Projection en lecture seule du Trading Cockpit.
 *
 * Layout :
 *
 * A:I = Dashboard principal
 * J   = séparateur visuel
 * K:N = Action Required
 *
 * Les trois groupes de métriques utilisent :
 *
 * A:C
 * D:F
 * G:I
 *
 * Le Dashboard ne possède aucune donnée métier.
 * Il peut être reconstruit depuis les feuilles sources.
 */


function refreshDashboard() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      DASHBOARD_SHEET
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        DASHBOARD_SHEET
      );
  }


  // ==========================================================
  // RESET
  // ==========================================================

  sheet
    .getRange('A1:N50')
    .breakApart();

  sheet.clear();

  sheet.clearFormats();

  sheet.clearConditionalFormatRules();

  sheet
    .getCharts()
    .forEach(chart =>
      sheet.removeChart(chart)
    );


  // ==========================================================
  // TITLE
  // ==========================================================

  sheet
    .getRange('A1:I1')
    .merge()
    .setValue(
      'TRADING COCKPIT'
    )
    .setFontWeight('bold')
    .setFontSize(18)
    .setHorizontalAlignment(
      'center'
    );


  sheet
    .getRange('A2:I2')
    .merge()
    .setValue(
      `Last refresh: ${formatDashboardTimestamp(new Date())}`
    )
    .setHorizontalAlignment(
      'center'
    );


  // ==========================================================
  // ACCOUNT
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    4,
    'ACCOUNT'
  );


  const tradingConfig =
    getTradingConfig();


  writeDashboardMetricCard(
    sheet,
    'A5:C6',
    'Account',
    tradingConfig.accountName
  );


  writeDashboardMetricCard(
    sheet,
    'D5:F6',
    'Equity',
    tradingConfig.accountEquity,
    '$#,##0.00'
  );


  writeDashboardMetricCard(
    sheet,
    'G5:I6',
    'Currency',
    tradingConfig.currency
  );


  /*
   * Deux métriques secondaires restent affichées
   * dans la partie inférieure des cartes.
   */

  sheet
    .getRange('A6')
    .setValue(
      'Risk / Trade'
    );

  sheet
    .getRange('B6:C6')
    .merge()
    .setValue(
      tradingConfig.defaultRiskPercent
    )
    .setNumberFormat(
      '0.00%'
    )
    .setHorizontalAlignment(
      'right'
    );


  sheet
    .getRange('D6')
    .setValue(
      'Max Position'
    );

  sheet
    .getRange('E6:F6')
    .merge()
    .setValue(
      tradingConfig.maxPositionPercent
    )
    .setNumberFormat(
      '0.00%'
    )
    .setHorizontalAlignment(
      'right'
    );


  // ==========================================================
  // PIPELINE
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    8,
    'PIPELINE'
  );


  const pipeline =
    calculatePipelineMetrics();


  writeDashboardMetricBlock(
    sheet,
    'A9',
    'B9:C9',
    'Signals',
    pipeline.signals
  );


  writeDashboardMetricBlock(
    sheet,
    'D9',
    'E9:F9',
    'Watchlist',
    pipeline.watchlist
  );


  writeDashboardMetricBlock(
    sheet,
    'G9',
    'H9:I9',
    'Ready',
    pipeline.ready
  );


  writeDashboardMetricBlock(
    sheet,
    'A10',
    'B10:C10',
    'Trade Plans',
    pipeline.tradePlans
  );


  writeDashboardMetricBlock(
    sheet,
    'D10',
    'E10:F10',
    'Open Positions',
    pipeline.openPositions
  );


  writeDashboardMetricBlock(
    sheet,
    'G10',
    'H10:I10',
    'Closed Trades',
    pipeline.closedTrades
  );


  // ==========================================================
  // PERFORMANCE
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    12,
    'PERFORMANCE'
  );


  const performance =
    calculatePerformanceMetrics();


  writeDashboardMetricBlock(
    sheet,
    'A13',
    'B13:C13',
    'Realized P&L',
    performance.realizedPnl,
    '$#,##0.00'
  );


  writeDashboardMetricBlock(
    sheet,
    'D13',
    'E13:F13',
    'Win Rate',
    performance.winRate,
    '0.00%'
  );


  writeDashboardMetricBlock(
    sheet,
    'G13',
    'H13:I13',
    'Trades',
    performance.trades
  );


  writeDashboardMetricBlock(
    sheet,
    'A14',
    'B14:C14',
    'Average R',
    performance.averageR,
    '0.00'
  );


  writeDashboardMetricBlock(
    sheet,
    'D14',
    'E14:F14',
    'Total R',
    performance.totalR,
    '0.00'
  );


  writeDashboardMetricBlock(
    sheet,
    'G14',
    'H14:I14',
    'Wins',
    performance.wins
  );


  // ==========================================================
  // TOP MOMENTUM
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    16,
    'TOP MOMENTUM CANDIDATES'
  );


  writeTopMomentum(
    sheet,
    17
  );


  // ==========================================================
  // WATCHLIST
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    25,
    'WATCHLIST'
  );


  writeDashboardWatchlist(
    sheet,
    26
  );


  // ==========================================================
  // OPEN POSITIONS
  // ==========================================================

  writeDashboardSectionTitle(
    sheet,
    34,
    'OPEN POSITIONS'
  );


  writeDashboardPositions(
    sheet,
    35
  );


  // ==========================================================
  // ACTION REQUIRED
  // ==========================================================

  writeDashboardActions(
    sheet,
    pipeline
  );


  // ==========================================================
  // COLUMN WIDTHS
  // ==========================================================

  sheet.setColumnWidth(
    1,
    150
  );

  sheet.setColumnWidth(
    2,
    120
  );

  sheet.setColumnWidth(
    3,
    180
  );

  sheet.setColumnWidth(
    4,
    150
  );

  sheet.setColumnWidth(
    5,
    120
  );

  sheet.setColumnWidth(
    6,
    120
  );

  sheet.setColumnWidth(
    7,
    150
  );

  sheet.setColumnWidth(
    8,
    120
  );

  sheet.setColumnWidth(
    9,
    120
  );


  /*
   * J est volontairement vide.
   * Il sépare le cockpit des actions.
   */

  sheet.setColumnWidth(
    10,
    25
  );


  // Action Required : K:N

  sheet.setColumnWidth(
    11,
    120
  );

  sheet.setColumnWidth(
    12,
    110
  );

  sheet.setColumnWidth(
    13,
    110
  );

  sheet.setColumnWidth(
    14,
    130
  );


  // ==========================================================
  // FINAL THEME
  // ==========================================================

  applyDashboardTheme(
    sheet
  );


  sheet.setFrozenRows(
    2
  );


  ss.setActiveSheet(
    sheet
  );


  ss.toast(
    'Dashboard mis à jour.',
    'Trading Cockpit',
    5
  );
}


/**
 * ============================================================
 * PIPELINE METRICS
 * ============================================================
 */

function calculatePipelineMetrics() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  // ==========================================================
  // MOMENTUM RANKING
  // ==========================================================

  const ranking =
    ss.getSheetByName(
      MOMENTUM_RANKING_SHEET
    );


  const signals =
    ranking &&
    ranking.getLastRow() >= 6
      ? ranking.getLastRow() - 5
      : 0;


  // ==========================================================
  // WATCHLIST
  // ==========================================================

  const watchlist =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


  let watchlistCount = 0;
  let readyCount = 0;
  let nearBreakoutCount = 0;


  if (
    watchlist &&
    watchlist.getLastRow() > 1
  ) {

    const headers =
      getSheetHeaders(
        watchlist
      );


    const tickerIndex =
      requireColumn(
        headers,
        'Ticker'
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const distanceIndex =
      requireColumn(
        headers,
        'Distance to Breakout'
      );


    const data =
      watchlist
        .getRange(
          2,
          1,
          watchlist.getLastRow() - 1,
          watchlist.getLastColumn()
        )
        .getValues();


    data.forEach(row => {

      const ticker =
        String(
          row[tickerIndex] || ''
        ).trim();


      if (!ticker) {
        return;
      }


      watchlistCount++;


      const status =
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase();


      if (
        status === 'READY'
      ) {
        readyCount++;
      }


      const distance =
        Number(
          row[distanceIndex]
        );


      const activeForBreakout =
        status === 'WATCHING' ||
        status === 'READY';


      if (
        activeForBreakout &&
        Number.isFinite(distance) &&
        distance >= -0.02 &&
        distance <= 0
      ) {
        nearBreakoutCount++;
      }

    });
  }


  // ==========================================================
  // TRADE PLANS
  // ==========================================================

  const tradePlans =
    ss.getSheetByName(
      TRADE_PLANS_SHEET
    );


  let tradePlanCount = 0;


  if (
    tradePlans &&
    tradePlans.getLastRow() > 1
  ) {

    const headers =
      getSheetHeaders(
        tradePlans
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const data =
      tradePlans
        .getRange(
          2,
          1,
          tradePlans.getLastRow() - 1,
          tradePlans.getLastColumn()
        )
        .getValues();


    tradePlanCount =
      data.filter(row => {

        const status =
          String(
            row[statusIndex] || ''
          )
            .trim()
            .toUpperCase();


        return (
          status === 'DRAFT' ||
          status === 'READY'
        );

      }).length;
  }


  // ==========================================================
  // POSITIONS
  // ==========================================================

  const positions =
    ss.getSheetByName(
      POSITIONS_SHEET
    );


  let openPositions = 0;


  if (
    positions &&
    positions.getLastRow() > 1
  ) {

    const headers =
      getSheetHeaders(
        positions
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const data =
      positions
        .getRange(
          2,
          1,
          positions.getLastRow() - 1,
          positions.getLastColumn()
        )
        .getValues();


    openPositions =
      data.filter(row =>
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase() ===
        'OPEN'
      ).length;
  }


  // ==========================================================
  // JOURNAL
  // ==========================================================

  const journal =
    ss.getSheetByName(
      JOURNAL_SHEET
    );


  const closedTrades =
    countDataRows(
      journal
    );


  return {
    signals,
    watchlist: watchlistCount,
    ready: readyCount,
    nearBreakout: nearBreakoutCount,
    tradePlans: tradePlanCount,
    openPositions,
    closedTrades
  };
}


/**
 * ============================================================
 * PERFORMANCE METRICS
 * ============================================================
 */

function calculatePerformanceMetrics() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      JOURNAL_SHEET
    );


  if (
    !sheet ||
    sheet.getLastRow() <= 1
  ) {
    return {
      trades: 0,
      wins: 0,
      realizedPnl: 0,
      winRate: 0,
      averageR: 0,
      totalR: 0
    };
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const pnlIndex =
    requireColumn(
      headers,
      'Realized P&L'
    );


  const rIndex =
    requireColumn(
      headers,
      'R-Multiple'
    );


  const outcomeIndex =
    requireColumn(
      headers,
      'Outcome'
    );


  const positionIdIndex =
    requireColumn(
      headers,
      'Position ID'
    );


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        sheet.getLastColumn()
      )
      .getValues();


  const validTrades =
    data.filter(row =>
      String(
        row[positionIdIndex] || ''
      ).trim()
    );


  const trades =
    validTrades.length;


  const wins =
    validTrades.filter(row =>
      String(
        row[outcomeIndex] || ''
      )
        .trim()
        .toUpperCase() ===
      'WIN'
    ).length;


  const realizedPnl =
    validTrades.reduce(
      (sum, row) =>
        sum +
        (
          Number(
            row[pnlIndex]
          ) || 0
        ),
      0
    );


  const totalR =
    validTrades.reduce(
      (sum, row) =>
        sum +
        (
          Number(
            row[rIndex]
          ) || 0
        ),
      0
    );


  return {
    trades,
    wins,
    realizedPnl,

    winRate:
      trades > 0
        ? wins / trades
        : 0,

    averageR:
      trades > 0
        ? totalR / trades
        : 0,

    totalR
  };
}


/**
 * ============================================================
 * TOP MOMENTUM
 * ============================================================
 */

function writeTopMomentum(
  dashboard,
  startRow
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const ranking =
    ss.getSheetByName(
      MOMENTUM_RANKING_SHEET
    );


  const headers = [
    'Rank',
    'Ticker',
    'Score',
    'Price',
    '52W High',
    'Rel Volume',
    'RSI',
    'Review'
  ];


  dashboard
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ])
    .setFontWeight(
      'bold'
    );


  if (
    !ranking ||
    ranking.getLastRow() < 6
  ) {
    return;
  }


  const sourceHeaders =
    ranking
      .getRange(
        5,
        1,
        1,
        ranking.getLastColumn()
      )
      .getValues()[0]
      .map(value =>
        String(value).trim()
      );


  const data =
    ranking
      .getRange(
        6,
        1,
        ranking.getLastRow() - 5,
        ranking.getLastColumn()
      )
      .getValues();


  const top =
    data
      .slice(0, 5)
      .map(row => [

        valueFromRow(
          sourceHeaders,
          row,
          'Rank'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Ticker'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Momentum Score'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Price'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          '52W High'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Relative Volume'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'RSI'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Review Status'
        )
      ]);


  if (
    top.length === 0
  ) {
    return;
  }


  dashboard
    .getRange(
      startRow + 1,
      1,
      top.length,
      headers.length
    )
    .setValues(top);


  dashboard
    .getRange(
      startRow + 1,
      4,
      top.length,
      1
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      5,
      top.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );
}


/**
 * ============================================================
 * WATCHLIST VIEW
 * ============================================================
 */

function writeDashboardWatchlist(
  dashboard,
  startRow
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const source =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


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


  dashboard
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ])
    .setFontWeight(
      'bold'
    );


  if (
    !source ||
    source.getLastRow() <= 1
  ) {
    return;
  }


  const sourceHeaders =
    getSheetHeaders(
      source
    );


  const data =
    source
      .getRange(
        2,
        1,
        source.getLastRow() - 1,
        source.getLastColumn()
      )
      .getValues();


  const watchlistRows =
    data
      .filter(row =>
        String(
          valueFromRow(
            sourceHeaders,
            row,
            'Status'
          ) || ''
        )
          .trim()
          .toUpperCase() !==
        'REJECTED'
      )
      .slice(0, 5);


  if (
    watchlistRows.length === 0
  ) {
    return;
  }


  const rows =
    watchlistRows.map(row => [

      valueFromRow(
        sourceHeaders,
        row,
        'Ticker'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Current Price'
      ),

      '',

      valueFromRow(
        sourceHeaders,
        row,
        'Signal Price'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Change Since Signal'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Breakout Level'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Distance to Breakout'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Setup Status'
      ),

      valueFromRow(
        sourceHeaders,
        row,
        'Status'
      )
    ]);


  dashboard
    .getRange(
      startRow + 1,
      1,
      rows.length,
      headers.length
    )
    .setValues(rows);


  // ==========================================================
  // GOOGLEFINANCE 90 DAY TREND
  // ==========================================================

  watchlistRows.forEach(
    (row, index) => {

      const ticker =
        String(
          valueFromRow(
            sourceHeaders,
            row,
            'Ticker'
          ) || ''
        )
          .trim()
          .toUpperCase();


      if (!ticker) {
        return;
      }


      const dashboardRow =
        startRow + 1 + index;


      const formula =
        `=SPARKLINE(` +
        `INDEX(` +
        `GOOGLEFINANCE(` +
        `"${ticker}",` +
        `"close",` +
        `TODAY()-90,` +
        `TODAY()` +
        `),` +
        `0,` +
        `2` +
        `),` +
        `{"charttype","line";"linewidth",2}` +
        `)`;


      dashboard
        .getRange(
          dashboardRow,
          3
        )
        .setFormula(
          formula
        );
    }
  );


  // ==========================================================
  // NUMBER FORMATS
  // ==========================================================

  dashboard
    .getRange(
      startRow + 1,
      2,
      rows.length,
      1
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      4,
      rows.length,
      1
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      5,
      rows.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  dashboard
    .getRange(
      startRow + 1,
      6,
      rows.length,
      1
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      7,
      rows.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {
    dashboard
      .setRowHeight(
        startRow + 1 + i,
        32
      );
  }
}


/**
 * ============================================================
 * OPEN POSITIONS VIEW
 * ============================================================
 */

function writeDashboardPositions(
  dashboard,
  startRow
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const source =
    ss.getSheetByName(
      POSITIONS_SHEET
    );


  const headers = [
    'Ticker',
    'Entry',
    'Current',
    'Stop',
    'Target',
    'Quantity',
    'P&L',
    'P&L %'
  ];


  dashboard
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ])
    .setFontWeight(
      'bold'
    );


  if (
    !source ||
    source.getLastRow() <= 1
  ) {
    return;
  }


  const sourceHeaders =
    getSheetHeaders(
      source
    );


  const data =
    source
      .getRange(
        2,
        1,
        source.getLastRow() - 1,
        source.getLastColumn()
      )
      .getValues();


  const rows =
    data
      .filter(row =>
        String(
          valueFromRow(
            sourceHeaders,
            row,
            'Status'
          ) || ''
        )
          .trim()
          .toUpperCase() ===
        'OPEN'
      )
      .slice(0, 5)
      .map(row => [

        valueFromRow(
          sourceHeaders,
          row,
          'Ticker'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Actual Entry'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Current Price'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Current Stop'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Target'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Actual Quantity'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Unrealized P&L'
        ),

        valueFromRow(
          sourceHeaders,
          row,
          'Unrealized P&L %'
        )
      ]);


  if (
    rows.length === 0
  ) {
    return;
  }


  dashboard
    .getRange(
      startRow + 1,
      1,
      rows.length,
      headers.length
    )
    .setValues(rows);


  dashboard
    .getRange(
      startRow + 1,
      2,
      rows.length,
      4
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      7,
      rows.length,
      1
    )
    .setNumberFormat(
      '$0.00'
    );


  dashboard
    .getRange(
      startRow + 1,
      8,
      rows.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );
}


/**
 * ============================================================
 * DASHBOARD HELPERS
 * ============================================================
 */

function writeDashboardSectionTitle(
  sheet,
  row,
  title
) {
  sheet
    .getRange(
      row,
      1,
      1,
      9
    )
    .merge()
    .setValue(title)
    .setFontWeight('bold')
    .setFontSize(12);
}


/**
 * Écrit une métrique dans une grille de 3 colonnes.
 *
 * Exemple :
 *
 * A = label
 * B:C = valeur
 */
function writeDashboardMetricBlock(
  sheet,
  labelCell,
  valueRange,
  label,
  value,
  numberFormat
) {
  sheet
    .getRange(
      labelCell
    )
    .setValue(
      label
    )
    .setFontWeight(
      'bold'
    );


  const range =
    sheet.getRange(
      valueRange
    );


  range
    .merge()
    .setValue(
      value
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      12
    )
    .setHorizontalAlignment(
      'right'
    );


  if (numberFormat) {
    range.setNumberFormat(
      numberFormat
    );
  }
  else {
    range.setNumberFormat(
      '0'
    );
  }
}


/**
 * Carte complète utilisée principalement
 * pour la première ligne Account.
 */
function writeDashboardMetricCard(
  sheet,
  rangeA1,
  label,
  value,
  numberFormat
) {
  const range =
    sheet.getRange(
      rangeA1
    );


  const row =
    range.getRow();


  const column =
    range.getColumn();


  const columns =
    range.getNumColumns();


  sheet
    .getRange(
      row,
      column
    )
    .setValue(
      label
    )
    .setFontWeight(
      'bold'
    );


  const valueRange =
    sheet.getRange(
      row,
      column + 1,
      1,
      columns - 1
    );


  valueRange
    .merge()
    .setValue(
      value
    )
    .setHorizontalAlignment(
      'right'
    );


  if (numberFormat) {
    valueRange.setNumberFormat(
      numberFormat
    );
  }
}


function valueFromRow(
  headers,
  row,
  headerName
) {
  const index =
    requireColumn(
      headers,
      headerName
    );

  return row[index];
}


function countDataRows(
  sheet
) {
  if (
    !sheet ||
    sheet.getLastRow() <= 1
  ) {
    return 0;
  }


  return (
    sheet.getLastRow() - 1
  );
}


function formatDashboardTimestamp(
  date
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  return Utilities.formatDate(
    date,
    ss.getSpreadsheetTimeZone(),
    'yyyy-MM-dd HH:mm:ss'
  );
}


/**
 * ============================================================
 * DASHBOARD THEME
 * ============================================================
 */

function applyDashboardTheme(
  sheet
) {
  const theme =
    COCKPIT_THEME;


  // ==========================================================
  // GLOBAL
  // ==========================================================

  sheet
    .getRange('A1:N45')
    .setFontFamily(
      'Arial'
    )
    .setFontColor(
      theme.text
    )
    .setVerticalAlignment(
      'middle'
    );


  // ==========================================================
  // TITLE
  // ==========================================================

  sheet
    .getRange('A1:I1')
    .setBackground(
      theme.navy
    )
    .setFontColor(
      theme.white
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      20
    );


  sheet
    .getRange('A2:I2')
    .setBackground(
      theme.navy
    )
    .setFontColor(
      '#CBD5E1'
    )
    .setFontSize(
      9
    );


  sheet.setRowHeight(
    1,
    38
  );


  sheet.setRowHeight(
    2,
    22
  );


  // ==========================================================
  // SECTION HEADERS
  // ==========================================================

  [
    4,
    8,
    12,
    16,
    25,
    34
  ].forEach(row => {

    sheet
      .getRange(
        row,
        1,
        1,
        9
      )
      .setBackground(
        theme.navy
      )
      .setFontColor(
        theme.white
      )
      .setFontWeight(
        'bold'
      );


    sheet.setRowHeight(
      row,
      26
    );
  });


  // ==========================================================
  // ACCOUNT
  // ==========================================================

  styleDashboardCard(
    sheet,
    'A5:C6',
    theme.lightBlue
  );


  styleDashboardCard(
    sheet,
    'D5:F6',
    theme.lightBlue
  );


  styleDashboardCard(
    sheet,
    'G5:I6',
    theme.lightBlue
  );


  // ==========================================================
  // PIPELINE
  // ==========================================================

  styleDashboardCard(
    sheet,
    'A9:C10',
    theme.lightGray
  );


  styleDashboardCard(
    sheet,
    'D9:F10',
    theme.lightGray
  );


  styleDashboardCard(
    sheet,
    'G9:I10',
    theme.lightGreen
  );


  // ==========================================================
  // PERFORMANCE
  // ==========================================================

  styleDashboardCard(
    sheet,
    'A13:C14',
    theme.lightGreen
  );


  styleDashboardCard(
    sheet,
    'D13:F14',
    theme.lightGreen
  );


  styleDashboardCard(
    sheet,
    'G13:I14',
    theme.lightGreen
  );


  // ==========================================================
  // TABLE HEADERS
  // ==========================================================

  [
    17,
    26,
    35
  ].forEach(row => {

    sheet
      .getRange(
        row,
        1,
        1,
        9
      )
      .setBackground(
        theme.blue
      )
      .setFontColor(
        theme.white
      )
      .setFontWeight(
        'bold'
      );

  });


  // ==========================================================
  // TABLE ROWS
  // ==========================================================

  applyDashboardAlternatingRows(
    sheet,
    18,
    22
  );


  applyDashboardAlternatingRows(
    sheet,
    27,
    31
  );


  applyDashboardAlternatingRows(
    sheet,
    36,
    40
  );


  // ==========================================================
  // SEPARATOR
  // ==========================================================

  sheet
    .getRange('J1:J45')
    .setBackground(
      theme.white
    );


  // ==========================================================
  // GRIDLINES
  // ==========================================================

  sheet.setHiddenGridlines(
    true
  );
}


/**
 * ============================================================
 * DASHBOARD ALTERNATING ROWS
 * ============================================================
 *
 * Version Dashboard spécifique à 9 colonnes.
 */

function applyDashboardAlternatingRows(
  sheet,
  startRow,
  endRow
) {
  for (
    let row = startRow;
    row <= endRow;
    row++
  ) {

    /*
     * Toutes les lignes reçoivent au minimum
     * une bordure légère afin que les cellules
     * restent visuellement identifiables.
     */

    sheet
      .getRange(
        row,
        1,
        1,
        9
      )
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


    if (
      (row - startRow) % 2 === 1
    ) {
      sheet
        .getRange(
          row,
          1,
          1,
          9
        )
        .setBackground(
          COCKPIT_THEME.lightGray
        );
    }
  }
}


/**
 * ============================================================
 * DASHBOARD ACTIONS
 * ============================================================
 *
 * K:N = Action Required
 *
 * J reste volontairement vide afin de séparer
 * visuellement ce panneau du Dashboard principal.
 */

function writeDashboardActions(
  sheet,
  pipeline
) {
  const actions =
    getDashboardActions();


  // ==========================================================
  // TITLE
  // ==========================================================

  sheet
    .getRange('K4:N4')
    .merge()
    .setValue(
      'ACTION REQUIRED'
    )
    .setBackground(
      COCKPIT_THEME.navy
    )
    .setFontColor(
      COCKPIT_THEME.white
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );


  // ==========================================================
  // SUMMARY
  // ==========================================================

  writeActionSummaryAtColumn(
    sheet,
    5,
    11,
    'NEAR BREAKOUT',
    actions.nearBreakout.length,
    actions.nearBreakout.length > 0
      ? COCKPIT_THEME.lightGreen
      : COCKPIT_THEME.lightGray
  );


  writeActionSummaryAtColumn(
    sheet,
    6,
    11,
    'READY TO TRADE',
    actions.ready.length,
    actions.ready.length > 0
      ? COCKPIT_THEME.lightGreen
      : COCKPIT_THEME.lightGray
  );


  writeActionSummaryAtColumn(
    sheet,
    7,
    11,
    'OPEN POSITIONS',
    actions.openPositions.length,
    actions.openPositions.length > 0
      ? COCKPIT_THEME.lightBlue
      : COCKPIT_THEME.lightGray
  );


  // ==========================================================
  // NEAR BREAKOUT
  // ==========================================================

  writeActionSectionAtColumn(
    sheet,
    9,
    11,
    'NEAR BREAKOUT'
  );


  let row = 10;


  if (
    actions.nearBreakout.length === 0
  ) {

    writeNoActionAtColumn(
      sheet,
      row,
      11,
      'No candidate near breakout'
    );


    row += 2;
  }
  else {

    actions.nearBreakout
      .slice(0, 5)
      .forEach(action => {

        sheet
          .getRange(
            row,
            11,
            1,
            4
          )
          .setValues([[
            action.ticker,
            action.currentPrice,
            action.breakout,
            action.distance
          ]]);


        sheet
          .getRange(
            row,
            11
          )
          .setFontWeight(
            'bold'
          );


        sheet
          .getRange(
            row,
            12,
            1,
            2
          )
          .setNumberFormat(
            '$0.00'
          );


        sheet
          .getRange(
            row,
            14
          )
          .setNumberFormat(
            '0.00%'
          );


        if (
          action.distance >= -0.01
        ) {
          sheet
            .getRange(
              row,
              11,
              1,
              4
            )
            .setBackground(
              COCKPIT_THEME.lightGreen
            );
        }


        row++;
      });


    row++;
  }


  // ==========================================================
  // READY TO TRADE
  // ==========================================================

  writeActionSectionAtColumn(
    sheet,
    row,
    11,
    'READY TO TRADE'
  );


  row++;


  if (
    actions.ready.length === 0
  ) {

    writeNoActionAtColumn(
      sheet,
      row,
      11,
      'No setup ready'
    );


    row += 2;
  }
  else {

    actions.ready
      .slice(0, 5)
      .forEach(action => {

        sheet
          .getRange(
            row,
            11,
            1,
            4
          )
          .setValues([[
            action.ticker,
            action.currentPrice,
            action.breakout,
            action.setup
          ]]);


        sheet
          .getRange(
            row,
            11
          )
          .setFontWeight(
            'bold'
          );


        sheet
          .getRange(
            row,
            12,
            1,
            2
          )
          .setNumberFormat(
            '$0.00'
          );


        sheet
          .getRange(
            row,
            11,
            1,
            4
          )
          .setBackground(
            COCKPIT_THEME.lightGreen
          );


        row++;
      });


    row++;
  }


  // ==========================================================
  // OPEN POSITIONS
  // ==========================================================

  writeActionSectionAtColumn(
    sheet,
    row,
    11,
    'OPEN POSITIONS'
  );


  row++;


  if (
    actions.openPositions.length === 0
  ) {

    writeNoActionAtColumn(
      sheet,
      row,
      11,
      'No open position'
    );

  }
  else {

    actions.openPositions
      .slice(0, 5)
      .forEach(action => {

        sheet
          .getRange(
            row,
            11,
            1,
            4
          )
          .setValues([[
            action.ticker,
            action.currentPrice,
            action.pnl,
            action.stopDistance
          ]]);


        sheet
          .getRange(
            row,
            11
          )
          .setFontWeight(
            'bold'
          );


        sheet
          .getRange(
            row,
            12
          )
          .setNumberFormat(
            '$0.00'
          );


        sheet
          .getRange(
            row,
            13,
            1,
            2
          )
          .setNumberFormat(
            '0.00%'
          );


        if (
          action.stopDistance !== null &&
          action.stopDistance <= 0.01
        ) {
          sheet
            .getRange(
              row,
              11,
              1,
              4
            )
            .setBackground(
              COCKPIT_THEME.lightRed
            );
        }


        row++;
      });
  }
}


/**
 * ============================================================
 * ACTION HELPERS
 * ============================================================
 */

function writeActionSummaryAtColumn(
  sheet,
  row,
  startColumn,
  label,
  count,
  background
) {
  sheet
    .getRange(
      row,
      startColumn,
      1,
      3
    )
    .merge()
    .setValue(
      label
    )
    .setBackground(
      background
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      startColumn + 3
    )
    .setValue(
      count
    )
    .setBackground(
      background
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );
}


function writeActionSectionAtColumn(
  sheet,
  row,
  startColumn,
  title
) {
  sheet
    .getRange(
      row,
      startColumn,
      1,
      4
    )
    .merge()
    .setValue(
      title
    )
    .setBackground(
      COCKPIT_THEME.blue
    )
    .setFontColor(
      COCKPIT_THEME.white
    )
    .setFontWeight(
      'bold'
    );
}


function writeNoActionAtColumn(
  sheet,
  row,
  startColumn,
  message
) {
  sheet
    .getRange(
      row,
      startColumn,
      1,
      4
    )
    .merge()
    .setValue(
      message
    )
    .setFontColor(
      COCKPIT_THEME.gray
    )
    .setFontStyle(
      'italic'
    );
}


/**
 * ============================================================
 * DASHBOARD ACTION DATA
 * ============================================================
 */

function getDashboardActions() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const result = {
    nearBreakout: [],
    ready: [],
    openPositions: []
  };


  // ==========================================================
  // WATCHLIST
  // ==========================================================

  const watchlist =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


  if (
    watchlist &&
    watchlist.getLastRow() > 1
  ) {

    const headers =
      getSheetHeaders(
        watchlist
      );


    const tickerIndex =
      requireColumn(
        headers,
        'Ticker'
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const distanceIndex =
      requireColumn(
        headers,
        'Distance to Breakout'
      );


    const currentPriceIndex =
      requireColumn(
        headers,
        'Current Price'
      );


    const breakoutIndex =
      requireColumn(
        headers,
        'Breakout Level'
      );


    const setupIndex =
      requireColumn(
        headers,
        'Setup Status'
      );


    const data =
      watchlist
        .getRange(
          2,
          1,
          watchlist.getLastRow() - 1,
          watchlist.getLastColumn()
        )
        .getValues();


    data.forEach(row => {

      const ticker =
        String(
          row[tickerIndex] || ''
        ).trim();


      if (!ticker) {
        return;
      }


      const status =
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase();


      const distance =
        Number(
          row[distanceIndex]
        );


      const currentPrice =
        Number(
          row[currentPriceIndex]
        );


      const breakout =
        Number(
          row[breakoutIndex]
        );


      const setup =
        String(
          row[setupIndex] || ''
        ).trim();


      // ======================================================
      // NEAR BREAKOUT
      // ======================================================

      const activeForBreakout =
        status === 'WATCHING' ||
        status === 'READY';


      if (
        activeForBreakout &&
        Number.isFinite(distance) &&
        distance >= -0.02 &&
        distance <= 0
      ) {
        result.nearBreakout.push({
          ticker,
          distance,
          currentPrice,
          breakout,
          setup
        });
      }


      // ======================================================
      // READY TO TRADE
      // ======================================================

      if (
        status === 'READY'
      ) {
        result.ready.push({
          ticker,
          currentPrice,
          breakout,
          setup
        });
      }

    });
  }


  // ==========================================================
  // POSITIONS
  // ==========================================================

  const positions =
    ss.getSheetByName(
      POSITIONS_SHEET
    );


  if (
    positions &&
    positions.getLastRow() > 1
  ) {

    const headers =
      getSheetHeaders(
        positions
      );


    const tickerIndex =
      requireColumn(
        headers,
        'Ticker'
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const entryIndex =
      requireColumn(
        headers,
        'Actual Entry'
      );


    const currentIndex =
      requireColumn(
        headers,
        'Current Price'
      );


    const stopIndex =
      requireColumn(
        headers,
        'Current Stop'
      );


    const pnlIndex =
      requireColumn(
        headers,
        'Unrealized P&L %'
      );


    const data =
      positions
        .getRange(
          2,
          1,
          positions.getLastRow() - 1,
          positions.getLastColumn()
        )
        .getValues();


    data.forEach(row => {

      const status =
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase();


      if (
        status !== 'OPEN'
      ) {
        return;
      }


      const ticker =
        String(
          row[tickerIndex] || ''
        ).trim();


      if (!ticker) {
        return;
      }


      const currentPrice =
        Number(
          row[currentIndex]
        );


      const stop =
        Number(
          row[stopIndex]
        );


      let stopDistance =
        null;


      if (
        Number.isFinite(
          currentPrice
        ) &&
        currentPrice > 0 &&
        Number.isFinite(
          stop
        )
      ) {
        stopDistance =
          (
            currentPrice -
            stop
          ) /
          currentPrice;
      }


      result.openPositions.push({
        ticker,

        entry:
          Number(
            row[entryIndex]
          ),

        currentPrice,

        stop,

        pnl:
          Number(
            row[pnlIndex]
          ),

        stopDistance
      });

    });
  }


  // ==========================================================
  // PRIORISATION
  // ==========================================================

  result.nearBreakout.sort(
    (a, b) =>
      Math.abs(
        a.distance
      ) -
      Math.abs(
        b.distance
      )
  );


  result.openPositions.sort(
    (a, b) => {

      if (
        a.stopDistance === null
      ) {
        return 1;
      }


      if (
        b.stopDistance === null
      ) {
        return -1;
      }


      return (
        a.stopDistance -
        b.stopDistance
      );
    }
  );


  return result;
}
