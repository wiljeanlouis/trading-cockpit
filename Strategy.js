/**
 * ============================================================
 * STRATEGY REGISTRY
 * ============================================================
 *
 * Registre central des stratégies supportées par le cockpit.
 *
 * Une stratégie possède :
 *
 * - une identité stable
 * - un nom
 * - une version
 * - un type
 * - un état enabled/disabled
 * - des paramètres généraux de risque
 *
 * Les paramètres spécifiques à une stratégie restent
 * dans leur propre configuration.
 */


function setupStrategies() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      STRATEGIES_SHEET
    );


  if (!sheet) {
    sheet =
      ss.insertSheet(
        STRATEGIES_SHEET
      );
  }


  // ==========================================================
  // HEADERS
  // ==========================================================

  sheet
    .getRange(
      1,
      1,
      1,
      STRATEGY_HEADERS.length
    )
    .setValues([
      STRATEGY_HEADERS
    ]);


  // ==========================================================
  // INITIAL STRATEGY
  // ==========================================================

  if (sheet.getLastRow() === 1) {

    sheet
      .getRange(
        2,
        1,
        1,
        STRATEGY_HEADERS.length
      )
      .setValues([[
        'MOMENTUM_BREAKOUT',
        'Momentum Breakout',
        'V1',
        'MOMENTUM',
        true,
        0.005,
        5,
        'Momentum breakout near 52-week high'
      ]]);
  }


  // ==========================================================
  // FORMATS
  // ==========================================================

  sheet
    .getRange('F2:F')
    .setNumberFormat(
      '0.00%'
    );


  // ==========================================================
  // ENABLED CHECKBOX
  // ==========================================================

  sheet
    .getRange('E2:E')
    .insertCheckboxes();


  // ==========================================================
  // TYPE VALIDATION
  // ==========================================================

  const typeRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'MOMENTUM',
          'BREAKOUT',
          'MEAN_REVERSION',
          'TREND_FOLLOWING',
          'EVENT_DRIVEN',
          'OTHER'
        ],
        true
      )
      .setAllowInvalid(false)
      .build();


  sheet
    .getRange('D2:D')
    .setDataValidation(
      typeRule
    );


  // ==========================================================
  // PRESENTATION
  // ==========================================================

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 90);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 350);


  themeSimpleSheet(
    ss,
    STRATEGIES_SHEET
  );


  ss.toast(
    'Strategies configuré.',
    'Trading Cockpit',
    5
  );
}

function getStrategy(
  strategyId
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      STRATEGIES_SHEET
    );


  if (
    !sheet ||
    sheet.getLastRow() <= 1
  ) {
    throw new Error(
      'Aucune stratégie configurée.'
    );
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const idIndex =
    requireColumn(
      headers,
      'Strategy ID'
    );


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        sheet.getLastColumn()
      )
      .getValues();


  const row =
    data.find(row =>
      String(
        row[idIndex] || ''
      )
        .trim()
        .toUpperCase() ===
      String(strategyId)
        .trim()
        .toUpperCase()
    );


  if (!row) {
    throw new Error(
      `Stratégie inconnue : ${strategyId}`
    );
  }


  return strategyFromRow(
    headers,
    row
  );
}

function strategyFromRow(
  headers,
  row
) {
  return {
    id:
      String(
        row[
          requireColumn(
            headers,
            'Strategy ID'
          )
        ] || ''
      ).trim(),

    name:
      String(
        row[
          requireColumn(
            headers,
            'Name'
          )
        ] || ''
      ).trim(),

    version:
      String(
        row[
          requireColumn(
            headers,
            'Version'
          )
        ] || ''
      ).trim(),

    type:
      String(
        row[
          requireColumn(
            headers,
            'Type'
          )
        ] || ''
      ).trim(),

    enabled:
      row[
        requireColumn(
          headers,
          'Enabled'
        )
      ] === true,

    riskPercent:
      Number(
        row[
          requireColumn(
            headers,
            'Risk %'
          )
        ]
      ) || 0,

    maxPositions:
      Number(
        row[
          requireColumn(
            headers,
            'Max Positions'
          )
        ]
      ) || 0,

    description:
      String(
        row[
          requireColumn(
            headers,
            'Description'
          )
        ] || ''
      ).trim()
  };
}

function getEnabledStrategies() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      STRATEGIES_SHEET
    );


  if (
    !sheet ||
    sheet.getLastRow() <= 1
  ) {
    return [];
  }


  const headers =
    getSheetHeaders(
      sheet
    );


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        sheet.getLastColumn()
      )
      .getValues();


  return data
    .map(row =>
      strategyFromRow(
        headers,
        row
      )
    )
    .filter(
      strategy =>
        strategy.enabled
    );
}

function validateStrategies() {
  const strategies =
    getEnabledStrategies();


  if (strategies.length === 0) {
    throw new Error(
      'Au moins une stratégie doit être active.'
    );
  }


  const ids = new Set();


  strategies.forEach(strategy => {

    if (!strategy.id) {
      throw new Error(
        'Strategy ID obligatoire.'
      );
    }


    if (ids.has(strategy.id)) {
      throw new Error(
        `Strategy ID dupliqué : ${strategy.id}`
      );
    }


    ids.add(
      strategy.id
    );


    if (
      strategy.riskPercent <= 0 ||
      strategy.riskPercent > 0.05
    ) {
      throw new Error(
        `Risk % invalide pour ${strategy.id}`
      );
    }


    if (
      strategy.maxPositions < 1
    ) {
      throw new Error(
        `Max Positions invalide pour ${strategy.id}`
      );
    }

  });


  return true;
}