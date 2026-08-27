/**
 * ============================================================
 * COCKPIT CONFIG
 * ============================================================
 *
 * Configuration générale du Trading Cockpit.
 *
 * Ces valeurs servent de DEFAULTS lors de la création
 * d'un Trade Plan.
 *
 * IMPORTANT :
 *
 * Les valeurs sont COPIÉES dans le Trade Plan.
 * Le Trade Plan conserve donc un snapshot historique
 * de la configuration utilisée au moment de sa création.
 */


const COCKPIT_CONFIG = {
  ACCOUNT_NAME: 'Account Name',
  ACCOUNT_EQUITY: 'Account Equity',
  DEFAULT_RISK_PERCENT: 'Default Risk %',
  MAX_POSITION_PERCENT: 'Max Position %',
  CURRENCY: 'Currency'
};


/**
 * Crée la feuille de configuration si elle
 * n'existe pas encore.
 *
 * Cette fonction ne détruit jamais une configuration
 * existante.
 */
function setupCockpitConfig() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      COCKPIT_CONFIG_SHEET
    );


  if (sheet) {
    ss.toast(
      'Cockpit Config existe déjà.',
      'Trading Cockpit',
      5
    );

    return;
  }


  sheet =
    ss.insertSheet(
      COCKPIT_CONFIG_SHEET
    );


  const values = [

    [
      'TRADING COCKPIT CONFIG',
      '',
      ''
    ],

    [
      '',
      '',
      ''
    ],

    [
      'Parameter',
      'Value',
      'Description'
    ],

    [
      COCKPIT_CONFIG.ACCOUNT_NAME,
      'Trading',
      'Nom du compte utilisé pour le trading actif'
    ],

    [
      COCKPIT_CONFIG.ACCOUNT_EQUITY,
      10000,
      'Valeur actuelle du compte utilisée pour le position sizing'
    ],

    [
      COCKPIT_CONFIG.DEFAULT_RISK_PERCENT,
      0.005,
      'Risque maximal par trade'
    ],

    [
      COCKPIT_CONFIG.MAX_POSITION_PERCENT,
      0.10,
      'Exposition maximale recommandée par position'
    ],

    [
      COCKPIT_CONFIG.CURRENCY,
      'CAD',
      'Devise du compte'
    ]
  ];


  sheet
    .getRange(
      1,
      1,
      values.length,
      3
    )
    .setValues(values);


  // Titre
  sheet
    .getRange('A1:C1')
    .merge()
    .setFontWeight('bold')
    .setFontSize(14);


  // Headers
  sheet
    .getRange('A3:C3')
    .setFontWeight('bold');


  // Account Equity
  sheet
    .getRange('B5')
    .setNumberFormat(
      '$#,##0.00'
    );


  // Default Risk %
  sheet
    .getRange('B6')
    .setNumberFormat(
      '0.00%'
    );


  // Max Position %
  sheet
    .getRange('B7')
    .setNumberFormat(
      '0.00%'
    );


  sheet.setFrozenRows(3);

  sheet.autoResizeColumns(
    1,
    3
  );


  ss.toast(
    'Cockpit Config créé.',
    'Trading Cockpit',
    5
  );
}


/**
 * Retourne toute la configuration nécessaire
 * à la création d'un Trade Plan.
 */
function getTradingConfig() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      COCKPIT_CONFIG_SHEET
    );


  if (!sheet) {
    throw new Error(
      `${COCKPIT_CONFIG_SHEET} est absent. ` +
      `Exécute d'abord Setup Cockpit Config.`
    );
  }


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 4) {
    throw new Error(
      `${COCKPIT_CONFIG_SHEET} est vide.`
    );
  }


  const values =
    sheet
      .getRange(
        4,
        1,
        lastRow - 3,
        2
      )
      .getValues();


  const config =
    {};


  values.forEach(row => {
    const key =
      String(
        row[0] || ''
      ).trim();

    if (!key) {
      return;
    }

    config[key] =
      row[1];
  });


  const accountName =
    String(
      config[
        COCKPIT_CONFIG.ACCOUNT_NAME
      ] || ''
    ).trim();


  const accountEquity =
    Number(
      config[
        COCKPIT_CONFIG.ACCOUNT_EQUITY
      ]
    );


  const defaultRiskPercent =
    Number(
      config[
        COCKPIT_CONFIG.DEFAULT_RISK_PERCENT
      ]
    );


  const maxPositionPercent =
    Number(
      config[
        COCKPIT_CONFIG.MAX_POSITION_PERCENT
      ]
    );


  const currency =
    String(
      config[
        COCKPIT_CONFIG.CURRENCY
      ] || ''
    )
      .trim()
      .toUpperCase();


  // ==========================================================
  // VALIDATIONS
  // ==========================================================

  if (!accountName) {
    throw new Error(
      'Account Name est obligatoire.'
    );
  }


  if (
    !Number.isFinite(accountEquity) ||
    accountEquity <= 0
  ) {
    throw new Error(
      'Account Equity doit être supérieur à 0.'
    );
  }


  if (
    !Number.isFinite(defaultRiskPercent) ||
    defaultRiskPercent <= 0 ||
    defaultRiskPercent > 1
  ) {
    throw new Error(
      'Default Risk % doit être compris entre 0% et 100%.'
    );
  }


  if (
    !Number.isFinite(maxPositionPercent) ||
    maxPositionPercent <= 0 ||
    maxPositionPercent > 1
  ) {
    throw new Error(
      'Max Position % doit être compris entre 0% et 100%.'
    );
  }


  if (!currency) {
    throw new Error(
      'Currency est obligatoire.'
    );
  }


  return {
    accountName,
    accountEquity,
    defaultRiskPercent,
    maxPositionPercent,
    currency
  };
}