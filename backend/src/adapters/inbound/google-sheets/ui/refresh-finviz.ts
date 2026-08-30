export function refreshFinvizFromSheets(refresh: () => number): number {
  const totalNewSignals = refresh();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${totalNewSignals} nouveau(x) signal(aux) archivé(s).`,
    'Trading Cockpit',
    5
  );
  return totalNewSignals;
}
