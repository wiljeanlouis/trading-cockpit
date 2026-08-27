/**
 * ============================================================
 * FINVIZ AUTHENTICATION
 * ============================================================
 *
 * Responsabilités :
 *
 * - configurer le token Finviz
 * - récupérer le token Finviz
 * - vérifier si Finviz est configuré
 *
 * Le token est stocké dans les Script Properties.
 * Il n'est jamais stocké dans une cellule du Google Sheet.
 *
 * Property :
 *
 * FINVIZ_TOKEN
 */


/**
 * ============================================================
 * CONFIGURE FINVIZ TOKEN
 * ============================================================
 *
 * Fonction appelée depuis le menu Trading Cockpit.
 *
 * Affiche une boîte de dialogue permettant de saisir le token
 * Finviz sans avoir à modifier le code Apps Script.
 */

function configureFinvizToken() {
  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      'Configuration Finviz',
      'Entre ton token API Finviz :',
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {
    return;
  }


  const token =
    String(
      response.getResponseText() || ''
    ).trim();


  if (!token) {
    ui.alert(
      'Le token Finviz ne peut pas être vide.'
    );

    return;
  }


  setFinvizToken(
    token
  );


  ui.alert(
    'Token Finviz enregistré avec succès.'
  );
}


/**
 * ============================================================
 * GET FINVIZ TOKEN
 * ============================================================
 */

function getFinvizToken() {
  const properties =
    PropertiesService
      .getScriptProperties();


  const token =
    properties.getProperty(
      'FINVIZ_TOKEN'
    );


  if (
    !token ||
    !String(token).trim()
  ) {
    throw new Error(
      'Token Finviz absent. ' +
      'Utilise Trading Cockpit > Configurer Finviz Token.'
    );
  }


  return String(token).trim();
}


/**
 * ============================================================
 * SET FINVIZ TOKEN
 * ============================================================
 */

function setFinvizToken(token) {
  const normalizedToken =
    String(
      token || ''
    ).trim();


  if (!normalizedToken) {
    throw new Error(
      'Le token Finviz ne peut pas être vide.'
    );
  }


  PropertiesService
    .getScriptProperties()
    .setProperty(
      'FINVIZ_TOKEN',
      normalizedToken
    );
}


/**
 * ============================================================
 * CHECK FINVIZ AUTH
 * ============================================================
 *
 * Vérifie uniquement que le token existe.
 *
 * Sa valeur n'est jamais affichée.
 */

function checkFinvizAuth() {
  const properties =
    PropertiesService
      .getScriptProperties();


  const token =
    properties.getProperty(
      'FINVIZ_TOKEN'
    );


  const configured =
    Boolean(
      token &&
      String(token).trim()
    );


  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  spreadsheet.toast(
    configured
      ? 'Token Finviz configuré.'
      : 'Token Finviz absent.',
    'Trading Cockpit',
    5
  );


  return configured;
}


/**
 * ============================================================
 * DELETE FINVIZ TOKEN
 * ============================================================
 *
 * Utile si le token doit être remplacé ou révoqué.
 */

function deleteFinvizToken() {
  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.alert(
      'Supprimer le token Finviz',
      'Veux-tu vraiment supprimer le token Finviz enregistré ?',
      ui.ButtonSet.YES_NO
    );


  if (
    response !==
    ui.Button.YES
  ) {
    return;
  }


  PropertiesService
    .getScriptProperties()
    .deleteProperty(
      'FINVIZ_TOKEN'
    );


  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      'Token Finviz supprimé.',
      'Trading Cockpit',
      5
    );
}