/**
 * Installs the supported Google Sheets technical menu.
 *
 * Operational workflows live in React/Cloud Run; the spreadsheet menu is intentionally limited to
 * canonical workbook setup and read-only validation.
 */
export function installCockpitMenu(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trading Cockpit')
    .addSubMenu(
      ui
        .createMenu('Setup')
        .addItem('Initialize Trading Cockpit', 'initializeTradingCockpit')
        .addItem('Validate Trading Cockpit', 'validateTradingCockpit')
    )
    .addToUi();
}
