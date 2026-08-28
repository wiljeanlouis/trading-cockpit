/**
 * ============================================================
 * WATCHLIST
 * ============================================================
 *
 * La Watchlist représente une décision humaine persistante.
 *
 * Momentum Ranking
 *       ↓
 * sélection humaine
 *       ↓
 * Watchlist
 *
 * Signal Price = valeur historique, immuable.
 * Current Price = valeur dynamique GOOGLEFINANCE.
 *
 *
 * IDENTITÉ
 * ============================================================
 *
 * Une entrée de Watchlist est identifiée métier par :
 *
 * Strategy ID
 * + Strategy Version
 * + Ticker
 *
 * Exemple :
 *
 * MOMENTUM_BREAKOUT | V1 | URBN
 *
 * Cela permet à un même ticker d'être surveillé
 * simultanément par plusieurs stratégies.
 */


function getOrCreateWatchlistSheet() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


  if (sheet) {
    return sheet;
  }


  sheet =
    ss.insertSheet(
      WATCHLIST_SHEET
    );


  const headers = [

    'Watchlist ID',          // A

    'Strategy ID',           // B
    'Strategy',              // C
    'Strategy Version',      // D

    'Signal Date',           // E

    'Ticker',                // F
    'Company',               // G
    'Sector',                // H

    'Added At',              // I

    'Signal Price',          // J

    'Current Price',         // K
    'Change Since Signal',   // L

    'Momentum Score',        // M

    'Status',                // N
    'Setup Status',          // O

    'Breakout Level',        // P
    'Distance to Breakout',  // Q
    'Invalidation Level',    // R

    'Earnings Date',         // S
    'Event Risk',            // T

    'Notes',                 // U

    'Closed At'              // V
  ];


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  sheet.setFrozenRows(
    1
  );


  refreshWatchlistValidations();


  sheet.autoResizeColumns(
    1,
    headers.length
  );


  themeWatchlist(
    ss
  );


  return sheet;
}


/**
 * ============================================================
 * WATCHLIST SCHEMA VALIDATION
 * ============================================================
 */

function validateWatchlistSchema(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const requiredHeaders = [

    'Watchlist ID',

    'Strategy ID',
    'Strategy',
    'Strategy Version',

    'Signal Date',

    'Ticker',
    'Company',
    'Sector',

    'Added At',

    'Signal Price',
    'Current Price',
    'Change Since Signal',

    'Momentum Score',

    'Status',
    'Setup Status',

    'Breakout Level',
    'Distance to Breakout',
    'Invalidation Level',

    'Earnings Date',
    'Event Risk',

    'Notes',
    'Closed At'
  ];


  requiredHeaders.forEach(
    header => {

      if (
        !headers.includes(
          header
        )
      ) {
        throw new Error(
          `Watchlist utilise un ancien schéma. ` +
          `Colonne absente : ${header}`
        );
      }

    }
  );


  return true;
}


/**
 * ============================================================
 * GOOGLEFINANCE + CALCULATIONS
 * ============================================================
 */

function addWatchlistFormulas(
  sheet,
  row
) {

  /*
   * K = Current Price
   *
   * Ticker = F
   */

  sheet
    .getRange(
      row,
      11
    )
    .setFormula(
      `=IFERROR(GOOGLEFINANCE(F${row},"price"),"")`
    );


  /*
   * L = Change Since Signal
   *
   * Current Price / Signal Price - 1
   *
   * Current Price = K
   * Signal Price  = J
   */

  sheet
    .getRange(
      row,
      12
    )
    .setFormula(
      `=IF(OR(J${row}="",K${row}=""),"",K${row}/J${row}-1)`
    );


  /*
   * Q = Distance to Breakout
   *
   * Current Price / Breakout Level - 1
   *
   * Current Price   = K
   * Breakout Level  = P
   */

  sheet
    .getRange(
      row,
      17
    )
    .setFormula(
      `=IF(OR(K${row}="",P${row}=""),"",K${row}/P${row}-1)`
    );
}


/**
 * ============================================================
 * DUPLICATE DETECTION
 * ============================================================
 *
 * Une entrée active est unique par :
 *
 * Strategy ID
 * + Strategy Version
 * + Ticker
 */

function findActiveWatchlistRow(
  sheet,
  ticker,
  strategyId,
  version
) {
  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <= 1
  ) {
    return -1;
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const tickerIndex =
    requireColumn(
      headers,
      'Ticker'
    );


  const strategyIdIndex =
    requireColumn(
      headers,
      'Strategy ID'
    );


  const versionIndex =
    requireColumn(
      headers,
      'Strategy Version'
    );


  const statusIndex =
    requireColumn(
      headers,
      'Status'
    );


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


  const normalizedTicker =
    String(
      ticker || ''
    )
      .trim()
      .toUpperCase();


  const normalizedStrategyId =
    String(
      strategyId || ''
    )
      .trim()
      .toUpperCase();


  const normalizedVersion =
    String(
      version || ''
    ).trim();


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const rowTicker =
      String(
        row[
          tickerIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    const rowStrategyId =
      String(
        row[
          strategyIdIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    const rowVersion =
      String(
        row[
          versionIndex
        ] || ''
      ).trim();


    const status =
      String(
        row[
          statusIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    const sameSecurity =
      rowTicker ===
        normalizedTicker
      &&
      rowStrategyId ===
        normalizedStrategyId
      &&
      rowVersion ===
        normalizedVersion;


    /*
     * CLOSED et REJECTED sont terminaux.
     *
     * Un nouveau signal futur peut donc recréer une entrée
     * Watchlist pour la même stratégie/version/ticker.
     */

    const active =
      status !== 'REJECTED'
      &&
      status !== 'CLOSED';


    if (
      sameSecurity &&
      active
    ) {
      return i + 2;
    }
  }


  return -1;
}


/**
 * ============================================================
 * FORMAT
 * ============================================================
 */

function formatWatchlistRow(
  sheet,
  row
) {

  // Signal Date
  sheet
    .getRange(
      row,
      5
    )
    .setNumberFormat(
      'yyyy-mm-dd'
    );


  // Added At
  sheet
    .getRange(
      row,
      9
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );


  // Signal Price
  sheet
    .getRange(
      row,
      10
    )
    .setNumberFormat(
      '$0.00'
    );


  // Current Price
  sheet
    .getRange(
      row,
      11
    )
    .setNumberFormat(
      '$0.00'
    );


  // Change Since Signal
  sheet
    .getRange(
      row,
      12
    )
    .setNumberFormat(
      '0.00%'
    );


  // Momentum Score
  sheet
    .getRange(
      row,
      13
    )
    .setNumberFormat(
      '0'
    );


  // Breakout Level
  sheet
    .getRange(
      row,
      16
    )
    .setNumberFormat(
      '$0.00'
    );


  // Distance to Breakout
  sheet
    .getRange(
      row,
      17
    )
    .setNumberFormat(
      '0.00%'
    );


  // Invalidation Level
  sheet
    .getRange(
      row,
      18
    )
    .setNumberFormat(
      '$0.00'
    );


  // Earnings Date
  sheet
    .getRange(
      row,
      19
    )
    .setNumberFormat(
      'yyyy-mm-dd'
    );


  // Closed At
  sheet
    .getRange(
      row,
      22
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );
}


/**
 * ============================================================
 * WATCHLIST VALIDATIONS
 * ============================================================
 */

function refreshWatchlistValidations() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


  if (!sheet) {
    throw new Error(
      'La Watchlist n’existe pas.'
    );
  }


  /*
   * Comme la structure de Watchlist peut évoluer,
   * on utilise désormais les headers plutôt que des
   * numéros de colonnes codés en dur.
   */

  const headers =
    getSheetHeaders(
      sheet
    );


  const statusColumn =
    requireColumn(
      headers,
      'Status'
    ) + 1;


  const setupStatusColumn =
    requireColumn(
      headers,
      'Setup Status'
    ) + 1;


  const eventRiskColumn =
    requireColumn(
      headers,
      'Event Risk'
    ) + 1;


  // ==========================================================
  // STATUS
  // ==========================================================

  const statusRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'WATCHING',
          'READY',
          'PLANNED',
          'ENTERED',
          'CLOSED',
          'REJECTED'
        ],
        true
      )
      .setAllowInvalid(
        false
      )
      .build();


  sheet
    .getRange(
      2,
      statusColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      statusRule
    );


  // ==========================================================
  // SETUP STATUS
  // ==========================================================

  const setupRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'NEAR BREAKOUT',
          'BREAKOUT',
          'CONFIRMED',
          'FAILED BREAKOUT',
          'EXTENDED'
        ],
        true
      )
      .setAllowInvalid(
        true
      )
      .build();


  sheet
    .getRange(
      2,
      setupStatusColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      setupRule
    );


  // ==========================================================
  // EVENT RISK
  // ==========================================================

  const eventRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'CLEAR',
          'EARNINGS SOON',
          'EARNINGS TODAY',
          'POST EARNINGS',
          'OTHER'
        ],
        true
      )
      .setAllowInvalid(
        true
      )
      .build();


  sheet
    .getRange(
      2,
      eventRiskColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      eventRule
    );


  ss.toast(
    'Validations de la Watchlist mises à jour.',
    'Trading Cockpit',
    5
  );
}
