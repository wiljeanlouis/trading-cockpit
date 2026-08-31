import type { TradingAccount } from '@trading-cockpit/backend-core/domain/trading-account';

export function setupTradingAccounts(
  listAccounts: () => TradingAccount[],
  setupCapitalLedger: () => void,
  setupRiskPolicy: () => void
): void {
  const accounts = listAccounts();
  setupCapitalLedger();
  setupRiskPolicy();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    accounts.length === 0
      ? 'Feuilles Accounts et Capital Ledger prêtes. Configure les comptes sans inventer de financement.'
      : `${accounts.length} Trading Account(s) configuré(s).`,
    'Trading Cockpit',
    7
  );
}
