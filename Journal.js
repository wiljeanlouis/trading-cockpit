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


/**
 * ============================================================
 * CREATE JOURNAL ENTRY FROM POSITION
 * ============================================================
 */

function createJournalEntryFromPosition(
  positionSheet,
  positionRowNumber
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const lastColumn =
    positionSheet.getLastColumn();


  const headers =
    positionSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0]
      .map(
        value =>
          String(value).trim()
      );


  /*
   * Important :
   *
   * Nous relisons la ligne APRÈS sa fermeture.
   *
   * Closed At, Exit Price et Realized P&L
   * ont donc déjà été enregistrés.
   */

  const row =
    positionSheet
      .getRange(
        positionRowNumber,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  // ==========================================================
  // IDENTIFIANTS
  // ==========================================================

  const positionId =
    getValueByHeader(
      headers,
      row,
      'Position ID'
    );


  const tradePlanId =
    getValueByHeader(
      headers,
      row,
      'Trade Plan ID'
    );


  const watchlistId =
    getValueByHeader(
      headers,
      row,
      'Watchlist ID'
    );


  // ==========================================================
  // STRATEGY SNAPSHOT
  // ==========================================================

  const strategyId =
    String(
      getValueByHeader(
        headers,
        row,
        'Strategy ID'
      ) || ''
    )
      .trim()
      .toUpperCase();


  const strategy =
    String(
      getValueByHeader(
        headers,
        row,
        'Strategy'
      ) || ''
    ).trim();


  const strategyVersion =
    String(
      getValueByHeader(
        headers,
        row,
        'Strategy Version'
      ) || ''
    ).trim();


  // ==========================================================
  // SECURITY
  // ==========================================================

  const ticker =
    String(
      getValueByHeader(
        headers,
        row,
        'Ticker'
      ) || ''
    )
      .trim()
      .toUpperCase();


  // ==========================================================
  // EXECUTION
  // ==========================================================

  const openedAt =
    getValueByHeader(
      headers,
      row,
      'Opened At'
    );


  const closedAt =
    getValueByHeader(
      headers,
      row,
      'Closed At'
    );


  const plannedEntry =
    getValueByHeader(
      headers,
      row,
      'Planned Entry'
    );


  const actualEntry =
    getValueByHeader(
      headers,
      row,
      'Actual Entry'
    );


  const exitPrice =
    getValueByHeader(
      headers,
      row,
      'Exit Price'
    );


  const quantity =
    getValueByHeader(
      headers,
      row,
      'Actual Quantity'
    );


  const initialStop =
    getValueByHeader(
      headers,
      row,
      'Initial Stop'
    );


  const target =
    getValueByHeader(
      headers,
      row,
      'Target'
    );


  const plannedMaxRisk =
    getValueByHeader(
      headers,
      row,
      'Planned Max Risk'
    );


  const plannedRiskReward =
    getValueByHeader(
      headers,
      row,
      'Planned R:R'
    );


  const realizedPnl =
    getValueByHeader(
      headers,
      row,
      'Realized P&L'
    );


  // ==========================================================
  // VALIDATIONS
  // ==========================================================

  if (!positionId) {
    throw new Error(
      'Position ID absent.'
    );
  }


  if (!tradePlanId) {
    throw new Error(
      'Trade Plan ID absent.'
    );
  }


  if (!watchlistId) {
    throw new Error(
      'Watchlist ID absent.'
    );
  }


  if (!strategyId) {
    throw new Error(
      'Strategy ID absent.'
    );
  }


  if (!strategy) {
    throw new Error(
      'Strategy absente.'
    );
  }


  if (!strategyVersion) {
    throw new Error(
      'Strategy Version absente.'
    );
  }


  if (!ticker) {
    throw new Error(
      'Ticker absent.'
    );
  }


  if (!closedAt) {
    throw new Error(
      `${ticker} n'a pas de Closed At.`
    );
  }


  if (
    exitPrice === '' ||
    exitPrice === null
  ) {
    throw new Error(
      `${ticker} n'a pas d'Exit Price.`
    );
  }


  // ==========================================================
  // JOURNAL
  // ==========================================================

  const journalSheet =
    getOrCreateJournalSheet();


  validateJournalSchema(
    journalSheet
  );


  /*
   * Une Position ne doit produire
   * qu'une seule entrée Journal.
   */

  const existingRow =
    findJournalRowByPositionId(
      journalSheet,
      positionId
    );


  if (
    existingRow !== -1
  ) {
    return;
  }


  // ==========================================================
  // INSERTION
  // ==========================================================

  const journalId =
    Utilities.getUuid();


  const newRow = [

    journalId,           // A  Journal ID

    positionId,          // B  Position ID

    tradePlanId,         // C  Trade Plan ID

    watchlistId,         // D  Watchlist ID

    strategyId,          // E  Strategy ID

    strategy,            // F  Strategy

    strategyVersion,     // G  Strategy Version

    ticker,              // H  Ticker

    openedAt,            // I  Opened At

    closedAt,            // J  Closed At

    plannedEntry,        // K  Planned Entry

    actualEntry,         // L  Actual Entry

    exitPrice,           // M  Exit Price

    quantity,            // N  Quantity

    initialStop,         // O  Initial Stop

    target,              // P  Target

    plannedMaxRisk,      // Q  Planned Max Risk

    plannedRiskReward,   // R  Planned R:R

    realizedPnl,         // S  Realized P&L

    '',                  // T  Return %

    '',                  // U  R-Multiple

    '',                  // V  Outcome

    '',                  // W  Exit Reason

    '',                  // X  Execution Notes

    '',                  // Y  Lessons Learned

    ''                   // Z  Followed Plan?
  ];


  journalSheet
    .appendRow(
      newRow
    );


  const insertedRow =
    journalSheet.getLastRow();


  addJournalFormulas(
    journalSheet,
    insertedRow
  );


  formatJournalRow(
    journalSheet,
    insertedRow
  );


  /*
   * Réapplique le thème afin d'inclure
   * la nouvelle ligne.
   */

  themeJournal(
    ss
  );
}


/**
 * ============================================================
 * JOURNAL SHEET
 * ============================================================
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