export interface TradingAccountRiskPolicy {
  accountId: string;
  riskPercentPerTrade: number;
}

export function createTradingAccountRiskPolicy(
  accountId: string,
  riskPercentPerTrade: number
): TradingAccountRiskPolicy {
  const normalizedAccountId = String(accountId || '')
    .trim()
    .toUpperCase();
  if (!normalizedAccountId) throw new Error('Account ID absent.');
  if (
    !Number.isFinite(riskPercentPerTrade) ||
    riskPercentPerTrade <= 0 ||
    riskPercentPerTrade > 1
  ) {
    throw new Error('Risk % doit être compris entre 0% et 100%.');
  }
  return { accountId: normalizedAccountId, riskPercentPerTrade };
}
