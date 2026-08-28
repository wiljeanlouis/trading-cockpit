export function refreshFinvizFromSheets(refresh: () => number): void {
  const totalNewSignals = refresh();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${totalNewSignals} nouveau(x) signal(aux) archivé(s).`,
    'Trading Cockpit',
    5
  );
}
