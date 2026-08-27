/**
 * ============================================================
 * FINVIZ
 * ============================================================
 *
 * Récupère les résultats des screeners Finviz configurés.
 *
 * Chaque ligne produite possède explicitement :
 *
 * - Strategy ID
 * - Strategy
 * - Strategy Version
 *
 * Strategy ID est l'identité technique stable de la stratégie.
 *
 * Exemple :
 *
 * MOMENTUM_BREAKOUT
 *
 * Strategy est le nom humain :
 *
 * Momentum Breakout
 *
 * Strategy Version représente la version des règles :
 *
 * V1
 *
 * IMPORTANT :
 *
 * Une fois ces informations attachées au signal, les étapes
 * suivantes du pipeline doivent les transporter telles quelles.
 *
 * Elles ne doivent pas essayer de redéduire la stratégie.
 */


/**
 * ============================================================
 * REFRESH ALL SCREENERS
 * ============================================================
 */

function refreshFinviz() {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  let totalNewSignals = 0;


  SCREENERS.forEach(config => {

    validateScreenerConfig(
      config
    );


    const result =
      refreshScreener(
        config
      );


    const added =
      archiveSignals(
        config,
        result
      );


    totalNewSignals += added;

  });


  spreadsheet.toast(
    `${totalNewSignals} nouveau(x) signal(aux) archivé(s).`,
    'Trading Cockpit',
    5
  );
}


/**
 * ============================================================
 * REFRESH ONE SCREENER
 * ============================================================
 */

function refreshScreener(config) {
  validateScreenerConfig(
    config
  );


  /*
   * On valide également que la stratégie existe
   * réellement dans le registre Strategies.
   *
   * Cela empêche un screener mal configuré de créer
   * des signaux avec un Strategy ID inconnu.
   */

  const strategy =
    getStrategy(
      config.strategyId
    );


  if (!strategy.enabled) {
    throw new Error(
      `La stratégie ${config.strategyId} est désactivée.`
    );
  }


  /*
   * La version configurée dans SCREENERS doit correspondre
   * à celle du registre Strategies.
   *
   * On évite ainsi :
   *
   * SCREENERS -> V1
   * Strategies -> V2
   */

  if (
    String(config.version).trim() !==
    String(strategy.version).trim()
  ) {
    throw new Error(
      `Version incohérente pour ${config.strategyId}. ` +
      `Screener=${config.version}, ` +
      `Strategies=${strategy.version}.`
    );
  }


  const token =
    getFinvizToken();


  const url =
    `${FINVIZ_BASE_URL}?` +
    `${config.query}` +
    `&auth=${encodeURIComponent(token)}`;


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'get',
        followRedirects: true,
        muteHttpExceptions: true
      }
    );


  const status =
    response.getResponseCode();


  if (status !== 200) {
    throw new Error(
      `Finviz API error pour ` +
      `${config.strategy}: ` +
      `HTTP ${status}`
    );
  }


  const csv =
    response.getContentText();


  if (
    !csv ||
    !csv.trim()
  ) {
    throw new Error(
      `Finviz a retourné un CSV vide ` +
      `pour ${config.strategy}.`
    );
  }


  const rows =
    Utilities.parseCsv(
      csv
    );


  if (
    !rows ||
    rows.length === 0
  ) {
    throw new Error(
      `Aucune donnée Finviz reçue ` +
      `pour ${config.strategy}.`
    );
  }


  updateCurrentScreenerSheet(
    config,
    rows
  );


  return rows;
}


/**
 * ============================================================
 * CURRENT SCREENER PROJECTION
 * ============================================================
 *
 * Cet onglet représente l'état courant du screener.
 *
 * Il est volontairement recalculable.
 *
 * Il ne constitue PAS l'historique des signaux.
 * L'historique est géré par archiveSignals().
 */

function updateCurrentScreenerSheet(
  config,
  rows
) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    spreadsheet.getSheetByName(
      config.sheetName
    );


  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        config.sheetName
      );
  }


  /*
   * Projection recalculable :
   * on supprime uniquement le contenu.
   *
   * Le thème / format de la feuille peut rester intact.
   */

  sheet.clearContents();


  const enrichedRows = [];


  /*
   * IMPORTANT :
   *
   * Strategy ID doit être la première information métier.
   *
   * Le pipeline peut ensuite transporter :
   *
   * Strategy ID
   * Strategy
   * Strategy Version
   */

  enrichedRows.push([
    'Strategy ID',
    'Strategy',
    'Strategy Version',
    'Refreshed At',
    ...rows[0]
  ]);


  const now =
    new Date();


  for (
    let i = 1;
    i < rows.length;
    i++
  ) {

    enrichedRows.push([
      config.strategyId,
      config.strategy,
      config.version,
      now,
      ...rows[i]
    ]);

  }


  sheet
    .getRange(
      1,
      1,
      enrichedRows.length,
      enrichedRows[0].length
    )
    .setValues(
      enrichedRows
    );


  /*
   * Refreshed At est maintenant la colonne 4
   * puisque Strategy ID a été ajouté.
   */

  if (
    enrichedRows.length > 1
  ) {

    sheet
      .getRange(
        2,
        4,
        enrichedRows.length - 1,
        1
      )
      .setNumberFormat(
        'yyyy-mm-dd hh:mm:ss'
      );

  }


  sheet.setFrozenRows(
    1
  );


  sheet.autoResizeColumns(
    1,
    sheet.getLastColumn()
  );


  /*
   * Réapplique le thème après reconstruction.
   */

  themeSimpleSheet(
    spreadsheet,
    config.sheetName
  );
}


/**
 * ============================================================
 * SCREENER CONFIG VALIDATION
 * ============================================================
 */

function validateScreenerConfig(
  config
) {
  if (!config) {
    throw new Error(
      'Configuration de screener absente.'
    );
  }


  if (
    !String(
      config.strategyId || ''
    ).trim()
  ) {
    throw new Error(
      'Strategy ID absent de la configuration du screener.'
    );
  }


  if (
    !String(
      config.strategy || ''
    ).trim()
  ) {
    throw new Error(
      `Strategy absente pour ${config.strategyId}.`
    );
  }


  if (
    !String(
      config.version || ''
    ).trim()
  ) {
    throw new Error(
      `Strategy Version absente pour ${config.strategyId}.`
    );
  }


  if (
    !String(
      config.sheetName || ''
    ).trim()
  ) {
    throw new Error(
      `sheetName absent pour ${config.strategyId}.`
    );
  }


  if (
    !String(
      config.query || ''
    ).trim()
  ) {
    throw new Error(
      `query Finviz absente pour ${config.strategyId}.`
    );
  }
}