const SPREADSHEET_ID_PROPERTY = 'TRADING_COCKPIT_SPREADSHEET_ID';

export function rememberActiveTradingCockpitSpreadsheet(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) return;
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
}

export function getTradingCockpitSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSpreadsheet) {
    PropertiesService.getScriptProperties().setProperty(
      SPREADSHEET_ID_PROPERTY,
      activeSpreadsheet.getId()
    );
    return activeSpreadsheet;
  }

  const spreadsheetId =
    PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) {
    throw new Error(
      'Trading Cockpit spreadsheet is not registered. Open the Google Sheet once to initialize it.'
    );
  }

  return SpreadsheetApp.openById(spreadsheetId);
}
