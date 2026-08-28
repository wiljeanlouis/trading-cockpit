export function configureFinvizTokenFromSheets(setToken: (token: unknown) => void): void {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Configuration Finviz',
    'Entre ton token API Finviz :',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const token = String(response.getResponseText() || '').trim();
  if (!token) {
    ui.alert('Le token Finviz ne peut pas être vide.');
    return;
  }
  setToken(token);
  ui.alert('Token Finviz enregistré avec succès.');
}

export function checkFinvizAuthFromSheets(checkAuth: () => boolean): boolean {
  const configured = checkAuth();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    configured ? 'Token Finviz configuré.' : 'Token Finviz absent.',
    'Trading Cockpit',
    5
  );
  return configured;
}

export function deleteFinvizTokenFromSheets(deleteToken: () => void): void {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Supprimer le token Finviz',
    'Veux-tu vraiment supprimer le token Finviz enregistré ?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;
  deleteToken();
  SpreadsheetApp.getActiveSpreadsheet().toast('Token Finviz supprimé.', 'Trading Cockpit', 5);
}
