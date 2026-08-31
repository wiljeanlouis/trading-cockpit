export interface TradingAccount {
  id: string;
  name: string;
  baseCurrency: string;
}

export type PortfolioScope = { type: 'ALL' } | { type: 'ACCOUNT'; accountId: string };

export function normalizeTradingAccount(account: TradingAccount): TradingAccount {
  const id = String(account.id || '')
    .trim()
    .toUpperCase();
  const name = String(account.name || '').trim();
  const baseCurrency = String(account.baseCurrency || '')
    .trim()
    .toUpperCase();

  if (!id) throw new Error('Account ID absent.');
  if (id === 'ALL') throw new Error('ALL est une portée de portefeuille, pas un Trading Account.');
  if (!name) throw new Error('Account Name absent.');
  if (!baseCurrency) throw new Error('Base Currency absente.');

  return { id, name, baseCurrency };
}

export function requireUniqueTradingAccountIds(accounts: TradingAccount[]): void {
  const seen = new Set<string>();
  for (const account of accounts) {
    if (seen.has(account.id)) throw new Error(`Trading Account ID dupliqué : ${account.id}`);
    seen.add(account.id);
  }
}
