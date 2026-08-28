import {
  normalizeTradingAccount,
  type TradingAccount
} from '../../../../core/domain/trading-account';
import {
  createTradingAccountRiskPolicy,
  type TradingAccountRiskPolicy
} from '../../../../core/domain/trading-account-risk-policy';
import { requireColumn } from '../sheet-headers';

export const TRADING_ACCOUNT_HEADERS = [
  'Account ID',
  'Name',
  'Base Currency',
  'Risk % Per Trade'
] as const;

export function tradingAccountFromRow(headers: string[], row: unknown[]): TradingAccount {
  return normalizeTradingAccount({
    id: String(row[requireColumn(headers, 'Account ID')] || ''),
    name: String(row[requireColumn(headers, 'Name')] || ''),
    baseCurrency: String(row[requireColumn(headers, 'Base Currency')] || '')
  });
}

export function tradingAccountRiskPolicyFromRow(
  headers: string[],
  row: unknown[]
): TradingAccountRiskPolicy | null {
  const accountId = String(row[requireColumn(headers, 'Account ID')] || '');
  const value = row[requireColumn(headers, 'Risk % Per Trade')];
  return value === '' || value === null
    ? null
    : createTradingAccountRiskPolicy(accountId, Number(value));
}
