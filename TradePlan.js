/**
 * ============================================================
 * TRADE PLAN
 * ============================================================
 *
 * Watchlist
 *      ↓
 * décision humaine
 *      ↓
 * Trade Plan
 *
 * Un Trade Plan n'est PAS un trade exécuté.
 *
 *
 * TRAÇABILITÉ
 * ============================================================
 *
 * Le Trade Plan conserve un snapshot de son origine :
 *
 * - Watchlist ID
 * - Strategy ID
 * - Strategy
 * - Strategy Version
 * - Signal Date
 *
 * Cela permet de reconstruire plus tard :
 *
 * Signal
 *   ↓
 * Watchlist
 *   ↓
 * Trade Plan
 *   ↓
 * Position
 *   ↓
 * Journal
 */


function getOrCreateTradePlansSheet() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      TRADE_PLANS_SHEET
    );


  if (sheet) {
    return sheet;
  }


  sheet =
    ss.insertSheet(
      TRADE_PLANS_SHEET
    );


  const headers = [

    'Trade Plan ID',       // A
    'Watchlist ID',        // B

    'Strategy ID',         // C
    'Strategy',            // D
    'Strategy Version',    // E

    'Signal Date',         // F
    'Signal Price',        // G

    'Ticker',              // H

    'Reference Price',     // I

    'Momentum Score',      // J

    'Setup Status',        // K
    'Breakout Level',      // L
    'Invalidation Level',  // M
    'Event Risk',          // N

    'Created At',          // O

    'Entry Type',          // P

    'Entry Price',         // Q
    'Stop Price',          // R
    'Target Price',        // S

    'Risk / Share',        // T
    'Reward / Share',      // U
    'Risk : Reward',       // V

    'Account Equity',      // W
    'Risk %',              // X
    'Max Risk $',          // Y

    'Position Size',       // Z
    'Position Value',      // AA

    'Status',              // AB

    'Notes',               // AC
    'Account ID'           // AD
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
    ])
    .setFontWeight(
      'bold'
    );


  sheet.setFrozenRows(
    1
  );


  refreshTradePlanValidations(
    sheet
  );


  sheet.autoResizeColumns(
    1,
    headers.length
  );


  themeTradePlans(
    ss
  );


  return sheet;
}


/**
 * ============================================================
 * TRADE PLAN SCHEMA VALIDATION
 * ============================================================
 */

function validateTradePlansSchema(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const requiredHeaders = [

    'Trade Plan ID',
    'Watchlist ID',

    'Strategy ID',
    'Strategy',
    'Strategy Version',

    'Signal Date',
    'Signal Price',

    'Ticker',

    'Reference Price',

    'Momentum Score',

    'Setup Status',
    'Breakout Level',
    'Invalidation Level',
    'Event Risk',

    'Created At',

    'Entry Type',

    'Entry Price',
    'Stop Price',
    'Target Price',

    'Risk / Share',
    'Reward / Share',
    'Risk : Reward',

    'Account Equity',
    'Risk %',
    'Max Risk $',

    'Position Size',
    'Position Value',

    'Status',

    'Notes'
  ];


  requiredHeaders.forEach(
    header => {

      if (
        !headers.includes(
          header
        )
      ) {
        throw new Error(
          `Trade Plans utilise un ancien schéma. ` +
          `Colonne absente : ${header}`
        );
      }

    }
  );


  return true;
}


/**
 * ============================================================
 * VALIDATIONS
 * ============================================================
 */

function refreshTradePlanValidations(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const entryTypeColumn =
    requireColumn(
      headers,
      'Entry Type'
    ) + 1;


  const statusColumn =
    requireColumn(
      headers,
      'Status'
    ) + 1;


  // ==========================================================
  // ENTRY TYPE
  // ==========================================================

  const entryTypeRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'BREAKOUT',
          'RETEST',
          'LIMIT'
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
      entryTypeColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      entryTypeRule
    );


  // ==========================================================
  // STATUS
  // ==========================================================

  const statusRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'DRAFT',
          'READY',
          'EXECUTED',
          'CANCELLED'
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
}


/**
 * ============================================================
 * FORMULAS
 * ============================================================
 */

function addTradePlanFormulas(
  sheet,
  row
) {

  /*
   * T = Risk / Share
   *
   * Entry - Stop
   */

  sheet
    .getRange(
      row,
      20
    )
    .setFormula(
      `=IF(OR(Q${row}="",R${row}=""),"",Q${row}-R${row})`
    );


  /*
   * U = Reward / Share
   *
   * Target - Entry
   */

  sheet
    .getRange(
      row,
      21
    )
    .setFormula(
      `=IF(OR(Q${row}="",S${row}=""),"",S${row}-Q${row})`
    );


  /*
   * V = Risk : Reward
   */

  sheet
    .getRange(
      row,
      22
    )
    .setFormula(
      `=IF(OR(T${row}="",T${row}<=0,U${row}=""),"",U${row}/T${row})`
    );


  /*
   * Y = Max Risk $
   *
   * Account Equity × Risk %
   */

  sheet
    .getRange(
      row,
      25
    )
    .setFormula(
      `=IF(OR(W${row}="",X${row}=""),"",W${row}*X${row})`
    );


  /*
   * Z = Position Size
   *
   * floor(Max Risk / Risk per Share)
   */

  sheet
    .getRange(
      row,
      26
    )
    .setFormula(
      `=IF(OR(Y${row}="",T${row}="",T${row}<=0),"",FLOOR(Y${row}/T${row},1))`
    );


  /*
   * AA = Position Value
   */

  sheet
    .getRange(
      row,
      27
    )
    .setFormula(
      `=IF(OR(Z${row}="",Q${row}=""),"",Z${row}*Q${row})`
    );
}


/**
 * ============================================================
 * ACTIVE PLAN DETECTION
 * ============================================================
 */

function findActiveTradePlanByWatchlistId(
  sheet,
  watchlistId
) {
  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {
    return -1;
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const watchlistIdIndex =
    requireColumn(
      headers,
      'Watchlist ID'
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


  const normalizedWatchlistId =
    String(
      watchlistId
    ).trim();


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const rowWatchlistId =
      String(
        row[
          watchlistIdIndex
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


    /*
     * Seulement DRAFT et READY représentent
     * encore un plan actif.
     *
     * EXECUTED :
     * le plan a déjà produit une position.
     *
     * CANCELLED :
     * le plan est abandonné.
     */

    const active =
      status === 'DRAFT' ||
      status === 'READY';


    if (
      rowWatchlistId ===
        normalizedWatchlistId
      &&
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

function formatTradePlanRow(
  sheet,
  row
) {

  // Signal Date
  sheet
    .getRange(
      row,
      6
    )
    .setNumberFormat(
      'yyyy-mm-dd'
    );


  // Signal Price
  sheet
    .getRange(
      row,
      7
    )
    .setNumberFormat(
      '$0.00'
    );


  // Reference Price
  sheet
    .getRange(
      row,
      9
    )
    .setNumberFormat(
      '$0.00'
    );


  // Breakout / Invalidation
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


  // Created At
  sheet
    .getRange(
      row,
      15
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );


  // Entry / Stop / Target
  sheet
    .getRange(
      row,
      17,
      1,
      3
    )
    .setNumberFormat(
      '$0.00'
    );


  // Risk / Reward $
  sheet
    .getRange(
      row,
      20,
      1,
      2
    )
    .setNumberFormat(
      '$0.00'
    );


  // Risk : Reward
  sheet
    .getRange(
      row,
      22
    )
    .setNumberFormat(
      '0.00'
    );


  // Account Equity
  sheet
    .getRange(
      row,
      23
    )
    .setNumberFormat(
      '$#,##0.00'
    );


  // Risk %
  sheet
    .getRange(
      row,
      24
    )
    .setNumberFormat(
      '0.00%'
    );


  // Max Risk
  sheet
    .getRange(
      row,
      25
    )
    .setNumberFormat(
      '$0.00'
    );


  // Position Size
  sheet
    .getRange(
      row,
      26
    )
    .setNumberFormat(
      '0'
    );


  // Position Value
  sheet
    .getRange(
      row,
      27
    )
    .setNumberFormat(
      '$#,##0.00'
    );
}
