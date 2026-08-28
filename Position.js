/**
 * ============================================================
 * POSITION
 * ============================================================
 *
 * Trade Plan
 *      ↓
 * exécution réelle / simulée
 *      ↓
 * Position
 *
 * Le Trade Plan conserve ce qui était prévu.
 * Position conserve ce qui a réellement été exécuté.
 *
 *
 * TRAÇABILITÉ
 * ============================================================
 *
 * La Position conserve :
 *
 * - Position ID
 * - Trade Plan ID
 * - Watchlist ID
 * - Strategy ID
 * - Strategy
 * - Strategy Version
 *
 * L'identité de stratégie est héritée du Trade Plan.
 * Elle ne doit jamais être redéduite ici.
 */


function getOrCreatePositionsSheet() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      POSITIONS_SHEET
    );


  if (sheet) {
    return sheet;
  }


  sheet =
    ss.insertSheet(
      POSITIONS_SHEET
    );


  const headers = [

    'Position ID',          // A

    'Trade Plan ID',        // B

    'Watchlist ID',         // C

    'Strategy ID',          // D

    'Strategy',             // E

    'Strategy Version',     // F

    'Ticker',               // G

    'Opened At',            // H

    'Planned Entry',        // I

    'Actual Entry',         // J

    'Planned Quantity',     // K

    'Actual Quantity',      // L

    'Initial Stop',         // M

    'Current Stop',         // N

    'Target',               // O

    'Planned Max Risk',     // P

    'Planned R:R',          // Q

    'Current Price',        // R

    'Unrealized P&L',       // S

    'Unrealized P&L %',     // T

    'Status',               // U

    'Closed At',            // V

    'Exit Price',           // W

    'Realized P&L',         // X

    'Notes'                 // Y
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


  refreshPositionValidations(
    sheet
  );


  sheet.autoResizeColumns(
    1,
    headers.length
  );


  themePositions(
    ss
  );


  return sheet;
}

/**
 * ============================================================
 * POSITIONS SCHEMA VALIDATION
 * ============================================================
 */

function validatePositionsSchema(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const requiredHeaders = [

    'Position ID',
    'Trade Plan ID',
    'Watchlist ID',

    'Strategy ID',
    'Strategy',
    'Strategy Version',

    'Ticker',

    'Opened At',

    'Planned Entry',
    'Actual Entry',

    'Planned Quantity',
    'Actual Quantity',

    'Initial Stop',
    'Current Stop',

    'Target',

    'Planned Max Risk',
    'Planned R:R',

    'Current Price',

    'Unrealized P&L',
    'Unrealized P&L %',

    'Status',

    'Closed At',
    'Exit Price',
    'Realized P&L',

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
          `Positions utilise un ancien schéma. ` +
          `Colonne absente : ${header}`
        );
      }

    }
  );


  return true;
}


/**
 * ============================================================
 * POSITION VALIDATIONS
 * ============================================================
 */

function refreshPositionValidations(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const statusColumn =
    requireColumn(
      headers,
      'Status'
    ) + 1;


  const statusRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'OPEN',
          'CLOSED',
          'STOPPED',
          'TARGET HIT'
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
 * POSITION FORMULAS
 * ============================================================
 */

function addPositionFormulas(
  sheet,
  row
) {

  /*
   * R = Current Price
   *
   * Ticker = G
   */

  sheet
    .getRange(
      row,
      18
    )
    .setFormula(
      `=IFERROR(GOOGLEFINANCE(G${row},"price"),"")`
    );


  /*
   * S = Unrealized P&L
   *
   * (Current Price - Actual Entry) × Quantity
   *
   * Current Price   = R
   * Actual Entry    = J
   * Actual Quantity = L
   */

  sheet
    .getRange(
      row,
      19
    )
    .setFormula(
      `=IF(OR(R${row}="",J${row}="",L${row}=""),"",` +
      `(R${row}-J${row})*L${row})`
    );


  /*
   * T = Unrealized P&L %
   */

  sheet
    .getRange(
      row,
      20
    )
    .setFormula(
      `=IF(OR(R${row}="",J${row}=""),"",R${row}/J${row}-1)`
    );
}


/**
 * ============================================================
 * DUPLICATE DETECTION
 * ============================================================
 */

function findOpenPositionByTradePlanId(
  sheet,
  tradePlanId
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


  const tradePlanIdIndex =
    requireColumn(
      headers,
      'Trade Plan ID'
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


  const normalizedTradePlanId =
    String(
      tradePlanId || ''
    ).trim();


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const rowTradePlanId =
      String(
        row[
          tradePlanIdIndex
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


    if (
      rowTradePlanId ===
        normalizedTradePlanId
      &&
      status === 'OPEN'
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

function formatPositionRow(
  sheet,
  row
) {

  // Opened At
  sheet
    .getRange(
      row,
      8
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );


  // Planned Entry / Actual Entry
  sheet
    .getRange(
      row,
      9,
      1,
      2
    )
    .setNumberFormat(
      '$0.00'
    );


  // Quantities
  sheet
    .getRange(
      row,
      11,
      1,
      2
    )
    .setNumberFormat(
      '0'
    );


  // Stops + Target
  sheet
    .getRange(
      row,
      13,
      1,
      3
    )
    .setNumberFormat(
      '$0.00'
    );


  // Planned Max Risk
  sheet
    .getRange(
      row,
      16
    )
    .setNumberFormat(
      '$0.00'
    );


  // Planned R:R
  sheet
    .getRange(
      row,
      17
    )
    .setNumberFormat(
      '0.00'
    );


  // Current Price
  sheet
    .getRange(
      row,
      18
    )
    .setNumberFormat(
      '$0.00'
    );


  // Unrealized P&L
  sheet
    .getRange(
      row,
      19
    )
    .setNumberFormat(
      '$0.00'
    );


  // Unrealized P&L %
  sheet
    .getRange(
      row,
      20
    )
    .setNumberFormat(
      '0.00%'
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


  // Exit Price
  sheet
    .getRange(
      row,
      23
    )
    .setNumberFormat(
      '$0.00'
    );


  // Realized P&L
  sheet
    .getRange(
      row,
      24
    )
    .setNumberFormat(
      '$0.00'
    );
}
