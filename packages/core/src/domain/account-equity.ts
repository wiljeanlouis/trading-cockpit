import type { AccountCapitalSummary } from './capital-transaction';
import type { JournalEntry } from './journal-entry';

export const ACCOUNT_EQUITY_BASIS = 'REALIZED' as const;

export interface AccountEquitySummary {
  accountId: string;
  baseCurrency: string;
  netExternalCapital: number;
  realizedPnl: number;
  realizedEquity: number;
  basis: typeof ACCOUNT_EQUITY_BASIS;
  markToMarketEquity: null;
}

/**
 * Calculates realized trading P&L strictly from Journal records, which are the authoritative
 * closed-trade history.
 */
export function calculateRealizedPnl(entries: JournalEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.realizedPnl === '' || entry.realizedPnl === null) {
      throw new Error(`Realized P&L absent pour le Journal ${entry.id}.`);
    }
    const value = Number(entry.realizedPnl);
    if (!Number.isFinite(value)) {
      throw new Error(`Realized P&L invalide pour le Journal ${entry.id}.`);
    }
    return total + value;
  }, 0);
}

/**
 * Builds the realized-equity summary used by sizing, Dashboard and Analytics. Mark-to-market,
 * buying power and cash accounting are intentionally outside this model.
 */
export function createAccountEquitySummary(
  capital: AccountCapitalSummary,
  entries: JournalEntry[]
): AccountEquitySummary {
  const realizedPnl = calculateRealizedPnl(entries);
  const realizedEquity = capital.netExternalCapital + realizedPnl;
  if (!Number.isFinite(realizedEquity) || realizedEquity <= 0) {
    throw new Error(`Equity réalisée invalide pour le compte ${capital.accountId}.`);
  }
  return {
    accountId: capital.accountId,
    baseCurrency: capital.baseCurrency,
    netExternalCapital: capital.netExternalCapital,
    realizedPnl,
    realizedEquity,
    basis: ACCOUNT_EQUITY_BASIS,
    markToMarketEquity: null
  };
}
