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


/**
 * ============================================================
 * EXECUTE SELECTED TRADE PLAN
 * ============================================================
 *
 * Crée une position à partir du Trade Plan sélectionné.
 */
/*
 * Cutover Phase 6 : le menu utilise désormais le wrapper global
 * executeSelectedTradePlan généré dans build/Cockpit.js.
 * Cette implémentation est conservée temporairement pour rollback.
 */
function legacyExecuteSelectedTradePlan_() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet =
    ss.getActiveSheet();


  // ==========================================================
  // VALIDATION SOURCE
  // ==========================================================

  if (
    sourceSheet.getName() !==
    TRADE_PLANS_SHEET
  ) {
    throw new Error(
      `Sélectionne un Trade Plan dans ${TRADE_PLANS_SHEET}.`
    );
  }


  const selectedRange =
    sourceSheet.getActiveRange();


  if (!selectedRange) {
    throw new Error(
      'Aucun Trade Plan sélectionné.'
    );
  }


  const rowNumber =
    selectedRange.getRow();


  if (rowNumber < 2) {
    throw new Error(
      'Sélectionne une ligne contenant un Trade Plan.'
    );
  }


  // ==========================================================
  // LECTURE DU TRADE PLAN
  // ==========================================================

  const lastColumn =
    sourceSheet.getLastColumn();


  const headers =
    sourceSheet
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


  const row =
    sourceSheet
      .getRange(
        rowNumber,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  // ==========================================================
  // IDENTIFIANTS
  // ==========================================================

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
  // PLAN
  // ==========================================================

  const plannedEntry =
    getValueByHeader(
      headers,
      row,
      'Entry Price'
    );


  const plannedStop =
    getValueByHeader(
      headers,
      row,
      'Stop Price'
    );


  const plannedTarget =
    getValueByHeader(
      headers,
      row,
      'Target Price'
    );


  const plannedSize =
    getValueByHeader(
      headers,
      row,
      'Position Size'
    );


  const maxRisk =
    getValueByHeader(
      headers,
      row,
      'Max Risk $'
    );


  const riskReward =
    getValueByHeader(
      headers,
      row,
      'Risk : Reward'
    );


  const status =
    String(
      getValueByHeader(
        headers,
        row,
        'Status'
      ) || ''
    )
      .trim()
      .toUpperCase();


  // ==========================================================
  // VALIDATIONS MÉTIER
  // ==========================================================

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


  /*
   * Vérifie que Strategy ID existe toujours dans
   * le registre.
   *
   * IMPORTANT :
   * on ne remplace pas Strategy Version par la
   * version actuellement configurée.
   */

  getStrategy(
    strategyId
  );


  /*
   * Pour notre V1, DRAFT et READY peuvent être exécutés
   * afin de faciliter le test du workflow.
   *
   * Plus tard, nous pourrons imposer READY uniquement.
   */

  if (
    status === 'EXECUTED'
  ) {
    throw new Error(
      `${ticker} est déjà marqué EXECUTED.`
    );
  }


  if (
    status === 'CANCELLED'
  ) {
    throw new Error(
      `Impossible d'exécuter un Trade Plan CANCELLED.`
    );
  }


  if (
    status !== 'DRAFT' &&
    status !== 'READY'
  ) {
    throw new Error(
      `Le Trade Plan ${ticker} ne peut pas être exécuté ` +
      `avec le statut ${status}.`
    );
  }


  if (
    plannedEntry === '' ||
    plannedEntry === null
  ) {
    throw new Error(
      `${ticker} n'a pas d'Entry Price.`
    );
  }


  if (
    plannedStop === '' ||
    plannedStop === null
  ) {
    throw new Error(
      `${ticker} n'a pas de Stop Price.`
    );
  }


  if (
    plannedSize === '' ||
    plannedSize === null ||
    Number(plannedSize) <= 0
  ) {
    throw new Error(
      `${ticker} n'a pas de Position Size valide.`
    );
  }


  // ==========================================================
  // POSITIONS
  // ==========================================================

  const positionsSheet =
    getOrCreatePositionsSheet();


  validatePositionsSchema(
    positionsSheet
  );


  const existingRow =
    findOpenPositionByTradePlanId(
      positionsSheet,
      tradePlanId
    );


  if (existingRow !== -1) {
    ss.toast(
      `${ticker} possède déjà une position ouverte.`,
      'Trading Cockpit',
      5
    );

    return;
  }


  // ==========================================================
  // EXECUTION
  // ==========================================================

  /*
   * Pour le moment :
   *
   * Actual Entry = Planned Entry
   * Actual Quantity = Planned Quantity
   *
   * Plus tard ces valeurs pourront provenir du broker.
   */

  const actualEntry =
    Number(plannedEntry);


  const actualQuantity =
    Number(plannedSize);


  const now =
    new Date();


  const positionId =
    Utilities.getUuid();


  const newRow = [

    positionId,          // A  Position ID

    tradePlanId,         // B  Trade Plan ID

    watchlistId,         // C  Watchlist ID

    strategyId,          // D  Strategy ID

    strategy,            // E  Strategy

    strategyVersion,     // F  Strategy Version

    ticker,              // G  Ticker

    now,                 // H  Opened At

    plannedEntry,        // I  Planned Entry

    actualEntry,         // J  Actual Entry

    plannedSize,         // K  Planned Quantity

    actualQuantity,      // L  Actual Quantity

    plannedStop,         // M  Initial Stop

    plannedStop,         // N  Current Stop

    plannedTarget,       // O  Target

    maxRisk,             // P  Planned Max Risk

    riskReward,          // Q  Planned R:R

    '',                  // R  Current Price

    '',                  // S  Unrealized P&L

    '',                  // T  Unrealized P&L %

    'OPEN',              // U  Status

    '',                  // V  Closed At

    '',                  // W  Exit Price

    '',                  // X  Realized P&L

    ''                   // Y  Notes
  ];


  positionsSheet
    .appendRow(
      newRow
    );


  const insertedRow =
    positionsSheet.getLastRow();


  addPositionFormulas(
    positionsSheet,
    insertedRow
  );


  formatPositionRow(
    positionsSheet,
    insertedRow
  );


  // ==========================================================
  // TRADE PLAN → EXECUTED
  // ==========================================================

  setValueByHeader(
    sourceSheet,
    headers,
    rowNumber,
    'Status',
    'EXECUTED'
  );


  // ==========================================================
  // WATCHLIST → ENTERED
  // ==========================================================

  updateWatchlistStatus(
    watchlistId,
    'ENTERED'
  );


  /*
   * Réapplique le thème après insertion.
   */

  themePositions(
    ss
  );


  ss.toast(
    `${ticker} exécuté — position créée.`,
    'Trading Cockpit',
    5
  );
}


/**
 * ============================================================
 * POSITIONS SHEET
 * ============================================================
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


/**
 * ============================================================
 * CLOSE POSITION
 * ============================================================
 *
 * Ferme la position sélectionnée.
 *
 * Le prix de sortie est saisi explicitement afin de conserver
 * le véritable prix d'exécution et non le Current Price
 * provenant de GOOGLEFINANCE.
 */
function legacyCloseSelectedPosition_() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getActiveSheet();


  // ==========================================================
  // VALIDATION SOURCE
  // ==========================================================

  if (
    sheet.getName() !==
    POSITIONS_SHEET
  ) {
    throw new Error(
      `Sélectionne une position dans ${POSITIONS_SHEET}.`
    );
  }


  const selectedRange =
    sheet.getActiveRange();


  if (!selectedRange) {
    throw new Error(
      'Aucune position sélectionnée.'
    );
  }


  const rowNumber =
    selectedRange.getRow();


  if (rowNumber < 2) {
    throw new Error(
      'Sélectionne une ligne contenant une position.'
    );
  }


  // ==========================================================
  // LECTURE
  // ==========================================================

  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
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


  const row =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const watchlistId =
    getValueByHeader(
      headers,
      row,
      'Watchlist ID'
    );


  const positionId =
    getValueByHeader(
      headers,
      row,
      'Position ID'
    );


  const strategyId =
    getValueByHeader(
      headers,
      row,
      'Strategy ID'
    );


  const ticker =
    getValueByHeader(
      headers,
      row,
      'Ticker'
    );


  const actualEntry =
    Number(
      getValueByHeader(
        headers,
        row,
        'Actual Entry'
      )
    );


  const actualQuantity =
    Number(
      getValueByHeader(
        headers,
        row,
        'Actual Quantity'
      )
    );


  const status =
    String(
      getValueByHeader(
        headers,
        row,
        'Status'
      ) || ''
    )
      .trim()
      .toUpperCase();


  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (!positionId) {
    throw new Error(
      'Position ID absent.'
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


  if (
    status !== 'OPEN'
  ) {
    throw new Error(
      `${ticker} n'est pas une position OPEN.`
    );
  }


  // ==========================================================
  // EXIT PRICE
  // ==========================================================

  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      `Fermer ${ticker}`,
      'Prix réel/simulé de sortie :',
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }


  /*
   * Accepte :
   *
   * 95.25
   * 95,25
   */

  const exitText =
    response
      .getResponseText()
      .trim()
      .replace(
        ',',
        '.'
      );


  const exitPrice =
    Number(
      exitText
    );


  if (
    !Number.isFinite(
      exitPrice
    ) ||
    exitPrice <= 0
  ) {
    throw new Error(
      'Le prix de sortie doit être supérieur à 0.'
    );
  }


  // ==========================================================
  // REALIZED P&L
  // ==========================================================

  const realizedPnl =
    (
      exitPrice -
      actualEntry
    ) *
    actualQuantity;


  const closedAt =
    new Date();


  // ==========================================================
  // UPDATE POSITION
  // ==========================================================

  setValueByHeader(
    sheet,
    headers,
    rowNumber,
    'Closed At',
    closedAt
  );


  setValueByHeader(
    sheet,
    headers,
    rowNumber,
    'Exit Price',
    exitPrice
  );


  setValueByHeader(
    sheet,
    headers,
    rowNumber,
    'Realized P&L',
    realizedPnl
  );


  setValueByHeader(
    sheet,
    headers,
    rowNumber,
    'Status',
    'CLOSED'
  );


  // ==========================================================
  // JOURNAL
  // ==========================================================

  createJournalEntryFromPosition(
    sheet,
    rowNumber
  );


  // ==========================================================
  // WATCHLIST → CLOSED
  // ==========================================================

  updateWatchlistStatus(
    watchlistId,
    'CLOSED'
  );


  /*
   * Réapplique le thème afin que le statut CLOSED
   * soit reflété visuellement.
   */

  themePositions(
    ss
  );


  ss.toast(
    `${ticker} fermé — P&L : ${realizedPnl.toFixed(2)}`,
    'Trading Cockpit',
    6
  );
}
