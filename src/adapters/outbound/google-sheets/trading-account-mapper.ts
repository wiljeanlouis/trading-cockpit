import { normalizeTradingAccount, type TradingAccount } from '../../../core/domain/trading-account';

export const TRADING_ACCOUNT_HEADERS = ['Account ID', 'Name', 'Base Currency'] as const;

function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);
  if (index === -1) throw new Error(`Colonne absente : ${name}`);
  return index;
}

export function tradingAccountFromRow(headers: string[], row: unknown[]): TradingAccount {
  return normalizeTradingAccount({
    id: String(row[requireColumn(headers, 'Account ID')] || ''),
    name: String(row[requireColumn(headers, 'Name')] || ''),
    baseCurrency: String(row[requireColumn(headers, 'Base Currency')] || '')
  });
}
