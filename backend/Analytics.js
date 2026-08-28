/**
 * ============================================================
 * ANALYTICS
 * ============================================================
 *
 * Projection analytique du Journal.
 *
 * Aucune donnée métier n'est saisie ici.
 * La feuille peut être reconstruite entièrement.
 *
 *
 * IDENTITÉ ANALYTIQUE
 * ============================================================
 *
 * Strategy ID est l'identité stable.
 *
 * Strategy est uniquement un nom humain.
 *
 * Strategy Version permet de comparer différentes versions
 * d'une même stratégie.
 *
 * Exemple :
 *
 * MOMENTUM_BREAKOUT
 *   ├── V1
 *   └── V2
 */


/**
 * ============================================================
 * REFRESH ANALYTICS
 * ============================================================
 */

function refreshAnalytics() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      ANALYTICS_SHEET
    );


  if (!sheet) {
    sheet =
      ss.insertSheet(
        ANALYTICS_SHEET
      );
  }


  // ==========================================================
  // RESET
  // ==========================================================

  sheet
    .getRange('A1:M150')
    .breakApart();


  sheet.clear();

  sheet.clearFormats();

  sheet.clearConditionalFormatRules();


  sheet
    .getCharts()
    .forEach(
      chart =>
        sheet.removeChart(
          chart
        )
    );


  // ==========================================================
  // DATA
  // ==========================================================

  const analytics =
    calculateTradingAnalytics();


  // ==========================================================
  // TITLE
  // ==========================================================

  sheet
    .getRange('A1:H1')
    .merge()
    .setValue(
      'TRADING ANALYTICS'
    );


  sheet
    .getRange('A2:H2')
    .merge()
    .setValue(
      `Based on ${analytics.trades} closed trade(s)`
    );


  // ==========================================================
  // CORE PERFORMANCE
  // ==========================================================

  writeAnalyticsSection(
    sheet,
    4,
    'PERFORMANCE'
  );


  writeAnalyticsMetric(
    sheet,
    'A5',
    'B5',
    'Trades',
    analytics.trades
  );


  writeAnalyticsMetric(
    sheet,
    'D5',
    'E5',
    'Win Rate',
    analytics.winRate,
    '0.00%'
  );


  writeAnalyticsMetric(
    sheet,
    'G5',
    'H5',
    'Profit Factor',
    analytics.profitFactor,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'A6',
    'B6',
    'Wins',
    analytics.wins
  );


  writeAnalyticsMetric(
    sheet,
    'D6',
    'E6',
    'Losses',
    analytics.losses
  );


  writeAnalyticsMetric(
    sheet,
    'G6',
    'H6',
    'Breakeven',
    analytics.breakeven
  );


  // ==========================================================
  // P&L
  // ==========================================================

  writeAnalyticsSection(
    sheet,
    8,
    'PROFIT & LOSS'
  );


  writeAnalyticsMetric(
    sheet,
    'A9',
    'B9',
    'Total P&L',
    analytics.totalPnl,
    '$#,##0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'D9',
    'E9',
    'Average P&L',
    analytics.averagePnl,
    '$#,##0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'G9',
    'H9',
    'Best Trade',
    analytics.bestPnl,
    '$#,##0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'A10',
    'B10',
    'Gross Profit',
    analytics.grossProfit,
    '$#,##0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'D10',
    'E10',
    'Gross Loss',
    analytics.grossLoss,
    '$#,##0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'G10',
    'H10',
    'Worst Trade',
    analytics.worstPnl,
    '$#,##0.00'
  );


  // ==========================================================
  // R ANALYTICS
  // ==========================================================

  writeAnalyticsSection(
    sheet,
    12,
    'R-MULTIPLE'
  );


  writeAnalyticsMetric(
    sheet,
    'A13',
    'B13',
    'Total R',
    analytics.totalR,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'D13',
    'E13',
    'Average R',
    analytics.averageR,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'G13',
    'H13',
    'Expectancy',
    analytics.expectancyR,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'A14',
    'B14',
    'Average Winner',
    analytics.averageWinnerR,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'D14',
    'E14',
    'Average Loser',
    analytics.averageLoserR,
    '0.00'
  );


  writeAnalyticsMetric(
    sheet,
    'G14',
    'H14',
    'Best R',
    analytics.bestR,
    '0.00'
  );


  // ==========================================================
  // PERFORMANCE BY STRATEGY
  // ==========================================================

  writeAnalyticsSection(
    sheet,
    17,
    'PERFORMANCE BY STRATEGY'
  );


  writeStrategyAnalytics(
    sheet,
    18,
    analytics.byStrategy
  );


  // ==========================================================
  // PERFORMANCE BY STRATEGY VERSION
  // ==========================================================

  const versionSectionRow =
    21 +
    analytics.byStrategy.length;


  writeAnalyticsSection(
    sheet,
    versionSectionRow,
    'PERFORMANCE BY STRATEGY VERSION'
  );


  writeStrategyVersionAnalytics(
    sheet,
    versionSectionRow + 1,
    analytics.byStrategyVersion
  );


  // ==========================================================
  // FORMATTING
  // ==========================================================

  sheet.setFrozenRows(
    2
  );


  for (
    let column = 1;
    column <= 8;
    column++
  ) {
    sheet.setColumnWidth(
      column,
      column % 3 === 1
        ? 150
        : 110
    );
  }


  themeAnalytics(
    ss
  );


  ss.setActiveSheet(
    sheet
  );


  ss.toast(
    'Analytics mis à jour.',
    'Trading Cockpit',
    5
  );
}


/**
 * ============================================================
 * CALCULATE TRADING ANALYTICS
 * ============================================================
 */

function calculateTradingAnalytics() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const journal =
    ss.getSheetByName(
      JOURNAL_SHEET
    );


  const emptyResult = {

    trades: 0,

    wins: 0,

    losses: 0,

    breakeven: 0,

    winRate: 0,

    totalPnl: 0,

    averagePnl: 0,

    grossProfit: 0,

    grossLoss: 0,

    bestPnl: 0,

    worstPnl: 0,

    totalR: 0,

    averageR: 0,

    averageWinnerR: 0,

    averageLoserR: 0,

    expectancyR: 0,

    bestR: 0,

    profitFactor: null,

    byStrategy: [],

    byStrategyVersion: []
  };


  if (
    !journal ||
    journal.getLastRow() <= 1
  ) {
    return emptyResult;
  }


  // ==========================================================
  // JOURNAL SCHEMA
  // ==========================================================

  const headers =
    getSheetHeaders(
      journal
    );


  const positionIndex =
    requireColumn(
      headers,
      'Position ID'
    );


  const strategyIdIndex =
    requireColumn(
      headers,
      'Strategy ID'
    );


  const strategyIndex =
    requireColumn(
      headers,
      'Strategy'
    );


  const versionIndex =
    requireColumn(
      headers,
      'Strategy Version'
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


  // ==========================================================
  // JOURNAL DATA
  // ==========================================================

  const data =
    journal
      .getRange(
        2,
        1,
        journal.getLastRow() - 1,
        journal.getLastColumn()
      )
      .getValues()
      .filter(
        row =>
          String(
            row[
              positionIndex
            ] || ''
          ).trim()
      );


  if (
    data.length === 0
  ) {
    return emptyResult;
  }


  const trades =
    data.map(
      row => ({

        strategyId:
          String(
            row[
              strategyIdIndex
            ] || 'UNKNOWN'
          )
            .trim()
            .toUpperCase(),

        strategy:
          String(
            row[
              strategyIndex
            ] || 'UNKNOWN'
          ).trim(),

        version:
          String(
            row[
              versionIndex
            ] || ''
          ).trim(),

        pnl:
          Number(
            row[
              pnlIndex
            ]
          ) || 0,

        r:
          Number(
            row[
              rIndex
            ]
          ) || 0
      })
    );


  // ==========================================================
  // WIN / LOSS
  // ==========================================================

  const winners =
    trades.filter(
      trade =>
        trade.pnl > 0
    );


  const losers =
    trades.filter(
      trade =>
        trade.pnl < 0
    );


  const breakeven =
    trades.filter(
      trade =>
        trade.pnl === 0
    );


  // ==========================================================
  // P&L
  // ==========================================================

  const totalPnl =
    sumValues(
      trades.map(
        trade =>
          trade.pnl
      )
    );


  const grossProfit =
    sumValues(
      winners.map(
        trade =>
          trade.pnl
      )
    );


  /*
   * Gross Loss est volontairement conservé négatif
   * pour l'affichage.
   */

  const grossLoss =
    sumValues(
      losers.map(
        trade =>
          trade.pnl
      )
    );


  // ==========================================================
  // R
  // ==========================================================

  const totalR =
    sumValues(
      trades.map(
        trade =>
          trade.r
      )
    );


  const winnerR =
    winners.map(
      trade =>
        trade.r
    );


  const loserR =
    losers.map(
      trade =>
        trade.r
    );


  const averageWinnerR =
    averageValues(
      winnerR
    );


  const averageLoserR =
    averageValues(
      loserR
    );


  /*
   * Expectancy en R :
   *
   * P(win) × Avg Win R
   * +
   * P(loss) × Avg Loss R
   */

  const winProbability =
    trades.length > 0
      ? winners.length /
        trades.length
      : 0;


  const lossProbability =
    trades.length > 0
      ? losers.length /
        trades.length
      : 0;


  const expectancyR =
    (
      winProbability *
      averageWinnerR
    ) +
    (
      lossProbability *
      averageLoserR
    );


  // ==========================================================
  // PROFIT FACTOR
  // ==========================================================

  let profitFactor =
    null;


  if (
    grossLoss < 0
  ) {
    profitFactor =
      grossProfit /
      Math.abs(
        grossLoss
      );
  }


  // ==========================================================
  // STRATEGY ANALYTICS
  // ==========================================================

  const byStrategy =
    calculateStrategyAnalytics(
      trades
    );


  const byStrategyVersion =
    calculateStrategyVersionAnalytics(
      trades
    );


  // ==========================================================
  // RESULT
  // ==========================================================

  return {

    trades:
      trades.length,

    wins:
      winners.length,

    losses:
      losers.length,

    breakeven:
      breakeven.length,

    winRate:
      trades.length > 0
        ? winners.length /
          trades.length
        : 0,

    totalPnl,

    averagePnl:
      averageValues(
        trades.map(
          trade =>
            trade.pnl
        )
      ),

    grossProfit,

    grossLoss,

    bestPnl:
      Math.max(
        ...trades.map(
          trade =>
            trade.pnl
        )
      ),

    worstPnl:
      Math.min(
        ...trades.map(
          trade =>
            trade.pnl
        )
      ),

    totalR,

    averageR:
      averageValues(
        trades.map(
          trade =>
            trade.r
        )
      ),

    averageWinnerR,

    averageLoserR,

    expectancyR,

    bestR:
      Math.max(
        ...trades.map(
          trade =>
            trade.r
        )
      ),

    profitFactor,

    byStrategy,

    byStrategyVersion
  };
}


/**
 * ============================================================
 * PERFORMANCE BY STRATEGY
 * ============================================================
 *
 * Toutes les versions d'un même Strategy ID sont regroupées.
 *
 * Exemple :
 *
 * MOMENTUM_BREAKOUT
 *   V1 + V2 + V3
 */

function calculateStrategyAnalytics(
  trades
) {
  const groups = {};


  trades.forEach(
    trade => {

      const key =
        trade.strategyId;


      if (
        !groups[key]
      ) {
        groups[key] = {
          strategyId:
            trade.strategyId,

          strategy:
            trade.strategy,

          trades: []
        };
      }


      groups[
        key
      ].trades.push(
        trade
      );
    }
  );


  return Object
    .values(
      groups
    )
    .map(
      group => {

        const metrics =
          calculateTradeGroupMetrics(
            group.trades
          );


        return {

          strategyId:
            group.strategyId,

          strategy:
            group.strategy,

          trades:
            metrics.trades,

          wins:
            metrics.wins,

          winRate:
            metrics.winRate,

          totalPnl:
            metrics.totalPnl,

          averageR:
            metrics.averageR,

          totalR:
            metrics.totalR
        };
      }
    )
    .sort(
      (a, b) =>
        b.totalR -
        a.totalR
    );
}


/**
 * ============================================================
 * PERFORMANCE BY STRATEGY VERSION
 * ============================================================
 *
 * Chaque version est analysée séparément.
 *
 * Exemple :
 *
 * MOMENTUM_BREAKOUT / V1
 * MOMENTUM_BREAKOUT / V2
 */

function calculateStrategyVersionAnalytics(
  trades
) {
  const groups = {};


  trades.forEach(
    trade => {

      const key =
        [
          trade.strategyId,
          trade.version
        ].join(
          '|'
        );


      if (
        !groups[key]
      ) {
        groups[key] = {

          strategyId:
            trade.strategyId,

          strategy:
            trade.strategy,

          version:
            trade.version,

          trades: []
        };
      }


      groups[
        key
      ].trades.push(
        trade
      );
    }
  );


  return Object
    .values(
      groups
    )
    .map(
      group => {

        const metrics =
          calculateTradeGroupMetrics(
            group.trades
          );


        return {

          strategyId:
            group.strategyId,

          strategy:
            group.strategy,

          version:
            group.version,

          trades:
            metrics.trades,

          wins:
            metrics.wins,

          winRate:
            metrics.winRate,

          totalPnl:
            metrics.totalPnl,

          averageR:
            metrics.averageR,

          totalR:
            metrics.totalR
        };
      }
    )
    .sort(
      (a, b) => {

        if (
          a.strategyId !==
          b.strategyId
        ) {
          return a.strategyId
            .localeCompare(
              b.strategyId
            );
        }


        return String(
          a.version
        ).localeCompare(
          String(
            b.version
          )
        );
      }
    );
}


/**
 * ============================================================
 * GROUP METRICS
 * ============================================================
 *
 * Calcul commun utilisé par :
 *
 * - Performance by Strategy
 * - Performance by Strategy Version
 */

function calculateTradeGroupMetrics(
  trades
) {
  const winners =
    trades.filter(
      trade =>
        trade.pnl > 0
    );


  const totalPnl =
    sumValues(
      trades.map(
        trade =>
          trade.pnl
      )
    );


  const totalR =
    sumValues(
      trades.map(
        trade =>
          trade.r
      )
    );


  return {

    trades:
      trades.length,

    wins:
      winners.length,

    winRate:
      trades.length > 0
        ? winners.length /
          trades.length
        : 0,

    totalPnl,

    averageR:
      trades.length > 0
        ? totalR /
          trades.length
        : 0,

    totalR
  };
}


/**
 * ============================================================
 * WRITE PERFORMANCE BY STRATEGY
 * ============================================================
 */

function writeStrategyAnalytics(
  sheet,
  startRow,
  strategies
) {
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


  sheet
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  if (
    !strategies ||
    strategies.length === 0
  ) {
    return;
  }


  const values =
    strategies.map(
      strategy => [

        strategy.strategyId,

        strategy.strategy,

        strategy.trades,

        strategy.wins,

        strategy.winRate,

        strategy.totalPnl,

        strategy.averageR,

        strategy.totalR
      ]
    );


  sheet
    .getRange(
      startRow + 1,
      1,
      values.length,
      headers.length
    )
    .setValues(
      values
    );


  sheet
    .getRange(
      startRow + 1,
      5,
      values.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      startRow + 1,
      6,
      values.length,
      1
    )
    .setNumberFormat(
      '$#,##0.00'
    );


  sheet
    .getRange(
      startRow + 1,
      7,
      values.length,
      2
    )
    .setNumberFormat(
      '0.00'
    );
}


/**
 * ============================================================
 * WRITE PERFORMANCE BY STRATEGY VERSION
 * ============================================================
 */

function writeStrategyVersionAnalytics(
  sheet,
  startRow,
  strategies
) {
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


  sheet
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  if (
    !strategies ||
    strategies.length === 0
  ) {
    return;
  }


  const values =
    strategies.map(
      strategy => [

        strategy.strategyId,

        strategy.strategy,

        strategy.version,

        strategy.trades,

        strategy.wins,

        strategy.winRate,

        strategy.totalPnl,

        strategy.averageR,

        strategy.totalR
      ]
    );


  sheet
    .getRange(
      startRow + 1,
      1,
      values.length,
      headers.length
    )
    .setValues(
      values
    );


  sheet
    .getRange(
      startRow + 1,
      6,
      values.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      startRow + 1,
      7,
      values.length,
      1
    )
    .setNumberFormat(
      '$#,##0.00'
    );


  sheet
    .getRange(
      startRow + 1,
      8,
      values.length,
      2
    )
    .setNumberFormat(
      '0.00'
    );
}