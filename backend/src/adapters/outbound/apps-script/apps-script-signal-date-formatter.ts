export function formatAppsScriptSignalDate(date: Date): string {
  const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(date, timezone, 'yyyy-MM-dd');
}
