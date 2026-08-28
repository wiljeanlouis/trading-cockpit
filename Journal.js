/**
 * ============================================================
 * TRADING JOURNAL
 * ============================================================
 *
 * Une ligne représente un trade terminé.
 *
 * Le Journal constitue l'historique final du workflow :
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
 *
 *
 * TRAÇABILITÉ
 * ============================================================
 *
 * Chaque trade terminé conserve :
 *
 * - Journal ID
 * - Position ID
 * - Trade Plan ID
 * - Watchlist ID
 * - Strategy ID
 * - Strategy
 * - Strategy Version
 *
 * L'identité de stratégie est héritée de Position.
 * Elle n'est jamais reconstruite à partir du registre courant.
 */


function getOrCreateJournalSheet() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      JOURNAL_SHEET
    );


  if (sheet) {
    return sheet;
  }


  sheet =
    ss.insertSheet(
      JOURNAL_SHEET
    );


  const headers = [

    'Journal ID',          // A

    'Position ID',         // B

    'Trade Plan ID',       // C

    'Watchlist ID',        // D

    'Strategy ID',         // E

    'Strategy',            // F

    'Strategy Version',    // G

    'Ticker',              // H

    'Opened At',           // I

    'Closed At',           // J

    'Planned Entry',       // K

    'Actual Entry',        // L

    'Exit Price',          // M

    'Quantity',            // N

    'Initial Stop',        // O

    'Target',              // P

    'Planned Max Risk',    // Q

    'Planned R:R',         // R

    'Realized P&L',        // S

    'Return %',            // T

    'R-Multiple',          // U

    'Outcome',             // V

    'Exit Reason',         // W

    'Execution Notes',     // X

    'Lessons Learned',     // Y

    'Followed Plan?'       // Z
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


  refreshJournalValidations(
    sheet
  );


  sheet.autoResizeColumns(
    1,
    headers.length
  );


  themeJournal(
    ss
  );


  return sheet;
}


/**
 * ============================================================
 * JOURNAL SCHEMA VALIDATION
 * ============================================================
 */

function validateJournalSchema(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const requiredHeaders = [

    'Journal ID',

    'Position ID',
    'Trade Plan ID',
    'Watchlist ID',

    'Strategy ID',
    'Strategy',
    'Strategy Version',

    'Ticker',

    'Opened At',
    'Closed At',

    'Planned Entry',
    'Actual Entry',
    'Exit Price',

    'Quantity',

    'Initial Stop',
    'Target',

    'Planned Max Risk',
    'Planned R:R',

    'Realized P&L',

    'Return %',
    'R-Multiple',
    'Outcome',

    'Exit Reason',

    'Execution Notes',
    'Lessons Learned',

    'Followed Plan?'
  ];


  requiredHeaders.forEach(
    header => {

      if (
        !headers.includes(
          header
        )
      ) {
        throw new Error(
          `Journal utilise un ancien schéma. ` +
          `Colonne absente : ${header}`
        );
      }

    }
  );


  return true;
}


/**
 * ============================================================
 * JOURNAL VALIDATIONS
 * ============================================================
 */

function refreshJournalValidations(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const exitReasonColumn =
    requireColumn(
      headers,
      'Exit Reason'
    ) + 1;


  const followedPlanColumn =
    requireColumn(
      headers,
      'Followed Plan?'
    ) + 1;


  // ==========================================================
  // EXIT REASON
  // ==========================================================

  const exitReasonRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'TARGET',
          'STOP',
          'TRAILING STOP',
          'MANUAL',
          'SETUP INVALIDATED',
          'TIME EXIT',
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
      exitReasonColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      exitReasonRule
    );


  // ==========================================================
  // FOLLOWED PLAN
  // ==========================================================

  const followedPlanRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'YES',
          'PARTIALLY',
          'NO'
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
      followedPlanColumn,
      sheet.getMaxRows() - 1,
      1
    )
    .setDataValidation(
      followedPlanRule
    );
}


/**
 * ============================================================
 * JOURNAL FORMULAS
 * ============================================================
 */

function addJournalFormulas(
  sheet,
  row
) {

  /*
   * T = Return %
   *
   * Exit / Actual Entry - 1
   */

  sheet
    .getRange(
      row,
      20
    )
    .setFormula(
      `=IF(OR(L${row}="",M${row}=""),"",M${row}/L${row}-1)`
    );


  /*
   * U = R-Multiple
   *
   * Realized P&L / Planned Max Risk
   *
   * +2R = gagné deux fois le risque prévu.
   * -1R = perdu l'équivalent du risque prévu.
   */

  sheet
    .getRange(
      row,
      21
    )
    .setFormula(
      `=IF(OR(Q${row}="",Q${row}<=0,S${row}=""),"",S${row}/Q${row})`
    );


  /*
   * V = Outcome
   */

  sheet
    .getRange(
      row,
      22
    )
    .setFormula(
      `=IF(S${row}="","",IF(S${row}>0,"WIN",IF(S${row}<0,"LOSS","BREAKEVEN")))`
    );
}


/**
 * ============================================================
 * DUPLICATE DETECTION
 * ============================================================
 */

function findJournalRowByPositionId(
  sheet,
  positionId
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
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


  const normalizedPositionId =
    String(
      positionId || ''
    ).trim();


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];


    const rowPositionId =
      String(
        row[
          positionIdIndex
        ] || ''
      ).trim();


    if (
      rowPositionId ===
      normalizedPositionId
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

function formatJournalRow(
  sheet,
  row
) {

  // Opened At / Closed At
  sheet
    .getRange(
      row,
      9,
      1,
      2
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );


  // Planned Entry / Actual Entry / Exit Price
  sheet
    .getRange(
      row,
      11,
      1,
      3
    )
    .setNumberFormat(
      '$0.00'
    );


  // Quantity
  sheet
    .getRange(
      row,
      14
    )
    .setNumberFormat(
      '0'
    );


  // Initial Stop + Target
  sheet
    .getRange(
      row,
      15,
      1,
      2
    )
    .setNumberFormat(
      '$0.00'
    );


  // Planned Max Risk
  sheet
    .getRange(
      row,
      17
    )
    .setNumberFormat(
      '$0.00'
    );


  // Planned R:R
  sheet
    .getRange(
      row,
      18
    )
    .setNumberFormat(
      '0.00'
    );


  // Realized P&L
  sheet
    .getRange(
      row,
      19
    )
    .setNumberFormat(
      '$0.00'
    );


  // Return %
  sheet
    .getRange(
      row,
      20
    )
    .setNumberFormat(
      '0.00%'
    );


  // R-Multiple
  sheet
    .getRange(
      row,
      21
    )
    .setNumberFormat(
      '0.00'
    );
}
