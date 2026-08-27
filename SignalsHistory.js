/**
 * ============================================================
 * SIGNAL HISTORY
 * ============================================================
 *
 * Historique immuable des signaux détectés par les screeners.
 *
 * Responsabilités :
 *
 * - archiver les signaux produits par Finviz
 * - conserver l'identité de la stratégie
 * - conserver la version de la stratégie
 * - empêcher les doublons pour un même snapshot journalier
 *
 * IMPORTANT :
 *
 * Signals History est un historique.
 *
 * Contrairement à :
 *
 * - Finviz Screener
 * - Momentum Ranking
 *
 * cette feuille ne doit PAS être reconstruite à chaque refresh.
 *
 *
 * Identité d'un signal :
 *
 * Signal Date
 * + Strategy ID
 * + Strategy Version
 * + Ticker
 *
 * Exemple :
 *
 * 2026-08-27
 * MOMENTUM_BREAKOUT
 * V1
 * URBN
 */


/**
 * ============================================================
 * ARCHIVE SIGNALS
 * ============================================================
 */

function archiveSignals(
  config,
  rows
) {
  if (
    !rows ||
    rows.length <= 1
  ) {
    return 0;
  }


  if (
    !config ||
    !String(
      config.strategyId || ''
    ).trim()
  ) {
    throw new Error(
      'Strategy ID absent lors de l’archivage des signaux.'
    );
  }


  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    getOrCreateHistorySheet(
      spreadsheet,
      rows[0]
    );


  const tickerColumnIndex =
    findTickerColumn(
      rows[0]
    );


  const existingKeys =
    loadExistingSignalKeys(
      sheet
    );


  const now =
    new Date();


  const signalDate =
    formatSignalDate(
      now
    );


  const rowsToAppend = [];


  for (
    let i = 1;
    i < rows.length;
    i++
  ) {

    const finvizRow =
      rows[i];


    const ticker =
      String(
        finvizRow[
          tickerColumnIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    if (!ticker) {
      continue;
    }


    /*
     * ========================================================
     * SIGNAL IDENTITY
     * ========================================================
     *
     * On utilise Strategy ID plutôt que le nom humain.
     *
     * Le nom peut éventuellement changer.
     *
     * MOMENTUM_BREAKOUT, lui, représente l'identité stable
     * de la stratégie.
     */

    const key =
      buildSignalKey(
        signalDate,
        config.strategyId,
        config.version,
        ticker
      );


    if (
      existingKeys.has(
        key
      )
    ) {
      continue;
    }


    rowsToAppend.push([
      signalDate,
      now,

      config.strategyId,
      config.strategy,
      config.version,

      ticker,

      ...finvizRow
    ]);


    existingKeys.add(
      key
    );
  }


  if (
    rowsToAppend.length === 0
  ) {
    return 0;
  }


  const startRow =
    sheet.getLastRow() + 1;


  sheet
    .getRange(
      startRow,
      1,
      rowsToAppend.length,
      rowsToAppend[0].length
    )
    .setValues(
      rowsToAppend
    );


  /*
   * Signal Date
   */

  sheet
    .getRange(
      startRow,
      1,
      rowsToAppend.length,
      1
    )
    .setNumberFormat(
      'yyyy-mm-dd'
    );


  /*
   * Detected At
   */

  sheet
    .getRange(
      startRow,
      2,
      rowsToAppend.length,
      1
    )
    .setNumberFormat(
      'yyyy-mm-dd hh:mm:ss'
    );


  /*
   * Réapplique le thème après ajout des nouvelles lignes.
   */

  themeTechnicalSheet(
    spreadsheet,
    SIGNALS_HISTORY_SHEET
  );


  return rowsToAppend.length;
}


/**
 * ============================================================
 * GET / CREATE HISTORY SHEET
 * ============================================================
 *
 * Gère trois situations :
 *
 * 1. feuille inexistante
 * 2. feuille existante mais vide
 * 3. feuille existante avec historique
 */

function getOrCreateHistorySheet(
  spreadsheet,
  finvizHeaders
) {
  let sheet =
    spreadsheet.getSheetByName(
      SIGNALS_HISTORY_SHEET
    );


  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        SIGNALS_HISTORY_SHEET
      );

  }


  /*
   * ==========================================================
   * HEADERS
   * ==========================================================
   *
   * Une feuille existante mais vide doit également recevoir
   * ses headers.
   *
   * C'est important parce qu'un onglet Signals History vide
   * peut avoir été créé manuellement auparavant.
   */

  if (
    sheet.getLastRow() === 0 ||
    isHistorySheetEmpty(sheet)
  ) {

    const headers = [
      'Signal Date',
      'Detected At',

      'Strategy ID',
      'Strategy',
      'Strategy Version',

      'Ticker',

      ...finvizHeaders
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


    themeTechnicalSheet(
      spreadsheet,
      SIGNALS_HISTORY_SHEET
    );


    return sheet;
  }


  /*
   * ==========================================================
   * SCHEMA VALIDATION
   * ==========================================================
   *
   * Si la feuille contient déjà des données, on refuse
   * silencieusement de modifier sa structure.
   *
   * Une migration explicite serait nécessaire.
   */

  validateSignalHistorySchema(
    sheet
  );


  return sheet;
}


/**
 * ============================================================
 * EMPTY SHEET CHECK
 * ============================================================
 */

function isHistorySheetEmpty(
  sheet
) {
  if (
    sheet.getLastRow() === 0
  ) {
    return true;
  }


  if (
    sheet.getLastRow() > 1
  ) {
    return false;
  }


  const lastColumn =
    sheet.getLastColumn();


  if (
    lastColumn === 0
  ) {
    return true;
  }


  const values =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  return values.every(
    value =>
      !String(
        value || ''
      ).trim()
  );
}


/**
 * ============================================================
 * SCHEMA VALIDATION
 * ============================================================
 */

function validateSignalHistorySchema(
  sheet
) {
  const headers =
    getSheetHeaders(
      sheet
    );


  const requiredHeaders = [
    'Signal Date',
    'Detected At',
    'Strategy ID',
    'Strategy',
    'Strategy Version',
    'Ticker'
  ];


  requiredHeaders.forEach(
    header => {

      if (
        !headers.includes(
          header
        )
      ) {
        throw new Error(
          `Signals History utilise un ancien schéma. ` +
          `Colonne absente : ${header}`
        );
      }

    }
  );


  return true;
}


/**
 * ============================================================
 * EXISTING SIGNAL KEYS
 * ============================================================
 */

function loadExistingSignalKeys(
  sheet
) {
  const keys =
    new Set();


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <= 1
  ) {
    return keys;
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const signalDateIndex =
    requireColumn(
      headers,
      'Signal Date'
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


  const tickerIndex =
    requireColumn(
      headers,
      'Ticker'
    );


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


  values.forEach(row => {

    const date =
      normalizeExistingDate(
        row[
          signalDateIndex
        ]
      );


    const strategyId =
      String(
        row[
          strategyIdIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    const version =
      String(
        row[
          versionIndex
        ] || ''
      ).trim();


    const ticker =
      String(
        row[
          tickerIndex
        ] || ''
      )
        .trim()
        .toUpperCase();


    if (
      !date ||
      !strategyId ||
      !ticker
    ) {
      return;
    }


    keys.add(
      buildSignalKey(
        date,
        strategyId,
        version,
        ticker
      )
    );

  });


  return keys;
}


/**
 * ============================================================
 * SIGNAL KEY
 * ============================================================
 */

function buildSignalKey(
  date,
  strategyId,
  version,
  ticker
) {
  return [
    String(
      date || ''
    ).trim(),

    String(
      strategyId || ''
    )
      .trim()
      .toUpperCase(),

    String(
      version || ''
    ).trim(),

    String(
      ticker || ''
    )
      .trim()
      .toUpperCase()
  ].join('|');
}


/**
 * ============================================================
 * FIND FINVIZ TICKER
 * ============================================================
 */

function findTickerColumn(
  headers
) {
  const index =
    headers.findIndex(
      header =>
        String(header)
          .trim()
          .toLowerCase() ===
        'ticker'
    );


  if (
    index === -1
  ) {
    throw new Error(
      'La colonne Ticker est absente ' +
      'de l’export Finviz.'
    );
  }


  return index;
}