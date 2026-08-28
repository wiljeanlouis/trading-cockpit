import type { TradingAccount } from '../../../core/domain/trading-account';

export function setupTradingAccounts(listAccounts: () => TradingAccount[]): void {
  const accounts = listAccounts();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    accounts.length === 0
      ? 'Feuille Accounts créée. Ajoute Account ID, Name et Base Currency.'
      : `${accounts.length} Trading Account(s) configuré(s).`,
    'Trading Cockpit',
    7
  );
}
