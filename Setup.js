/**
 * ============================================================
 * TRADING COCKPIT SETUP
 * ============================================================
 *
 * Fonctions utilisées pour initialiser les feuilles
 * nécessaires au Momentum Ranking.
 *
 * Ces fonctions ne font PAS partie du refresh quotidien.
 */


/**
 * Initialise les composants nécessaires
 * au Momentum Ranking.
 */
function setupMomentumRanking() {
  createMomentumScoreConfig();
  createMomentumRanking();

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      'Momentum Ranking configuré.',
      'Trading Cockpit',
      5
    );
}


/**
 * ============================================================
 * MOMENTUM SCORE CONFIG
 * ============================================================
 */

function createMomentumScoreConfig() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      MOMENTUM_SCORE_CONFIG_SHEET
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        MOMENTUM_SCORE_CONFIG_SHEET
      );
  }

  sheet.clear();


  const values = [

    [
      'MOMENTUM BREAKOUT SCORE V1',
      '',
      '',
      ''
    ],

    [
      '',
      '',
      '',
      ''
    ],

    [
      'Component',
      'Condition',
      'Points',
      'Max'
    ],


    // ========================================================
    // 52-WEEK HIGH
    // ========================================================

    [
      '52W High',
      '0% à -1%',
      25,
      25
    ],

    [
      '52W High',
      '-1% à -2%',
      22,
      ''
    ],

    [
      '52W High',
      '-2% à -3%',
      18,
      ''
    ],

    [
      '52W High',
      '-3% à -4%',
      14,
      ''
    ],

    [
      '52W High',
      '-4% à -5%',
      10,
      ''
    ],


    [
      '',
      '',
      '',
      ''
    ],


    // ========================================================
    // RELATIVE VOLUME
    // ========================================================

    [
      'Relative Volume',
      '>= 2.0',
      25,
      25
    ],

    [
      'Relative Volume',
      '1.5 à 1.99',
      20,
      ''
    ],

    [
      'Relative Volume',
      '1.25 à 1.49',
      15,
      ''
    ],

    [
      'Relative Volume',
      '1.0 à 1.24',
      10,
      ''
    ],


    [
      '',
      '',
      '',
      ''
    ],


    // ========================================================
    // PERFORMANCE MONTH
    // ========================================================

    [
      'Performance Month',
      '>= 20%',
      20,
      20
    ],

    [
      'Performance Month',
      '15% à 19.99%',
      17,
      ''
    ],

    [
      'Performance Month',
      '10% à 14.99%',
      14,
      ''
    ],

    [
      'Performance Month',
      '5% à 9.99%',
      10,
      ''
    ],

    [
      'Performance Month',
      '0% à 4.99%',
      5,
      ''
    ],


    [
      '',
      '',
      '',
      ''
    ],


    // ========================================================
    // RSI
    // ========================================================

    [
      'RSI',
      '60 à 67',
      15,
      15
    ],

    [
      'RSI',
      '55 à 59.99',
      12,
      ''
    ],

    [
      'RSI',
      '67.01 à 70',
      10,
      ''
    ],

    [
      'RSI',
      '50 à 54.99',
      7,
      ''
    ],


    [
      '',
      '',
      '',
      ''
    ],


    // ========================================================
    // SMA20 EXTENSION
    // ========================================================

    [
      'SMA20 Extension',
      '2% à 8%',
      15,
      15
    ],

    [
      'SMA20 Extension',
      '0% à 2%',
      10,
      ''
    ],

    [
      'SMA20 Extension',
      '8% à 12%',
      10,
      ''
    ],

    [
      'SMA20 Extension',
      '> 12%',
      5,
      ''
    ]
  ];


  sheet
    .getRange(
      1,
      1,
      values.length,
      4
    )
    .setValues(
      values
    );


  /*
   * Titre
   */
  sheet
    .getRange(
      'A1:D1'
    )
    .merge()
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      14
    );


  /*
   * Headers
   */
  sheet
    .getRange(
      'A3:D3'
    )
    .setFontWeight(
      'bold'
    );


  sheet.setFrozenRows(3);

  sheet.autoResizeColumns(
    1,
    4
  );
}


/**
 * ============================================================
 * MOMENTUM RANKING SHEET
 * ============================================================
 *
 * Cette fonction crée uniquement la structure initiale.
 *
 * refreshMomentumRanking() prendra ensuite en charge
 * le véritable contenu.
 */

function createMomentumRanking() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      MOMENTUM_RANKING_SHEET
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        MOMENTUM_RANKING_SHEET
      );
  }

  sheet.clear();


  const headers = [

    'Rank',

    'Ticker',

    'Company',

    'Sector',

    'Price',

    '52W High',

    '52W Score',

    'Relative Volume',

    'RelVol Score',

    'Performance Month',

    'Performance Score',

    'RSI',

    'RSI Score',

    'SMA20',

    'SMA20 Score',

    'Momentum Score',

    'Review Status'
  ];


  /*
   * Nous utilisons la même structure
   * que writeMomentumRanking().
   */

  sheet
    .getRange('A1')
    .setValue(
      'MOMENTUM BREAKOUT RANKING V1'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      14
    );


  sheet
    .getRange('A3')
    .setValue(
      'Score de priorisation seulement — pas un signal d’achat.'
    );


  sheet
    .getRange(
      5,
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


  sheet.setFrozenRows(5);

  sheet.autoResizeColumns(
    1,
    headers.length
  );
}