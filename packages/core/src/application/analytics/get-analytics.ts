import type {
  AnalyticsAccountRowDto,
  AnalyticsDto,
  AnalyticsStrategyRowDto,
  AnalyticsStrategyVersionRowDto,
  PortfolioScopeDto
} from '@trading-cockpit/contracts';
import type { JournalEntry } from '../../domain/journal-entry';
import { calculateOutcome } from '../../domain/journal-entry';
import type { TradingAccount } from '../../domain/trading-account';
import type { JournalReader } from '../../ports/outbound/journal-reader';

interface AnalyticsTrade {
  accountId: string;
  strategyId: string;
  strategy: string;
  version: string;
  pnl: number;
  r: number;
}

export interface GetAnalyticsDependencies {
  journalReader: JournalReader;
  now: () => Date;
  accounts?: readonly TradingAccount[];
}

export interface GetAnalyticsQuery {
  scope?: PortfolioScopeDto;
  strategyId?: string;
  strategyVersion?: string;
}

function emptyAnalytics(
  generatedAt: string,
  available: boolean,
  scope: PortfolioScopeDto
): AnalyticsDto {
  return {
    generatedAt,
    available,
    scope,
    summary: {
      trades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      profitFactor: null,
      totalPnl: 0,
      realizedPnl: 0,
      averagePnl: 0,
      bestPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      worstPnl: 0,
      totalR: 0,
      averageR: 0,
      expectancyR: 0,
      averageWinnerR: 0,
      averageLoserR: 0,
      bestR: 0
    },
    byStrategy: [],
    byStrategyVersion: [],
    byAccount: []
  };
}

function legacyNumberOrZero(value: unknown): number {
  return Number(value) || 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: readonly number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}

function tradeFromEntry(entry: JournalEntry): AnalyticsTrade | null {
  if (!String(entry.positionId || '').trim()) return null;

  return {
    accountId: String(entry.accountId || '')
      .trim()
      .toUpperCase(),
    strategyId: String(entry.strategyId || 'UNKNOWN')
      .trim()
      .toUpperCase(),
    strategy: String(entry.strategyName || 'UNKNOWN').trim(),
    version: String(entry.strategyVersion || '').trim(),
    pnl: legacyNumberOrZero(entry.realizedPnl),
    r: legacyNumberOrZero(entry.rMultiple)
  };
}

function groupMetrics(trades: readonly AnalyticsTrade[]) {
  const winners = trades.filter((trade) => trade.pnl > 0);
  const losers = trades.filter((trade) => trade.pnl < 0);
  const breakeven = trades.filter((trade) => calculateOutcome(trade.pnl) === 'BREAKEVEN');
  const totalPnl = sum(trades.map((trade) => trade.pnl));
  const totalR = sum(trades.map((trade) => trade.r));
  const grossProfit = sum(winners.map((trade) => trade.pnl));
  const grossLoss = sum(losers.map((trade) => trade.pnl));
  return {
    trades: trades.length,
    wins: winners.length,
    losses: losers.length,
    breakeven: breakeven.length,
    winRate: trades.length > 0 ? winners.length / trades.length : 0,
    realizedPnl: totalPnl,
    profitFactor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
    totalPnl,
    averageR: average(trades.map((trade) => trade.r)),
    totalR
  };
}

function calculateByStrategy(trades: readonly AnalyticsTrade[]): AnalyticsStrategyRowDto[] {
  const groups = new Map<
    string,
    { strategyId: string; strategy: string; trades: AnalyticsTrade[] }
  >();
  for (const trade of trades) {
    const current = groups.get(trade.strategyId) ?? {
      strategyId: trade.strategyId,
      strategy: trade.strategy,
      trades: []
    };
    current.trades.push(trade);
    groups.set(trade.strategyId, current);
  }

  return Array.from(groups.values())
    .map((group) => ({
      strategyId: group.strategyId,
      strategy: group.strategy,
      ...groupMetrics(group.trades)
    }))
    .sort((left, right) => right.totalR - left.totalR);
}

function calculateByStrategyVersion(
  trades: readonly AnalyticsTrade[]
): AnalyticsStrategyVersionRowDto[] {
  const groups = new Map<
    string,
    { strategyId: string; strategy: string; version: string; trades: AnalyticsTrade[] }
  >();
  for (const trade of trades) {
    const key = `${trade.strategyId}|${trade.version}`;
    const current = groups.get(key) ?? {
      strategyId: trade.strategyId,
      strategy: trade.strategy,
      version: trade.version,
      trades: []
    };
    current.trades.push(trade);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((group) => ({
      strategyId: group.strategyId,
      strategy: group.strategy,
      version: group.version,
      ...groupMetrics(group.trades)
    }))
    .sort((left, right) =>
      left.strategyId === right.strategyId
        ? String(left.version).localeCompare(String(right.version))
        : left.strategyId.localeCompare(right.strategyId)
    );
}

function calculateByAccount(
  trades: readonly AnalyticsTrade[],
  accounts: readonly TradingAccount[]
): AnalyticsAccountRowDto[] {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const groups = new Map<string, AnalyticsTrade[]>();
  for (const trade of trades) {
    if (!trade.accountId) continue;
    groups.set(trade.accountId, [...(groups.get(trade.accountId) ?? []), trade]);
  }

  return Array.from(groups.entries())
    .map(([accountId, accountTrades]) => ({
      accountId,
      accountName: accountNames.get(accountId) ?? null,
      ...groupMetrics(accountTrades)
    }))
    .map((row) => ({
      accountId: row.accountId,
      accountName: row.accountName,
      trades: row.trades,
      wins: row.wins,
      losses: row.losses,
      breakeven: row.breakeven,
      winRate: row.winRate,
      realizedPnl: row.realizedPnl,
      profitFactor: row.profitFactor,
      totalR: row.totalR,
      averageR: row.averageR
    }))
    .sort((left, right) => left.accountId.localeCompare(right.accountId));
}

function normalizeScope(scope?: PortfolioScopeDto): PortfolioScopeDto {
  if (!scope || scope.type === 'ALL') return { type: 'ALL' };
  const accountId = String(scope.accountId || '')
    .trim()
    .toUpperCase();
  if (!accountId) throw new Error('Account ID absent.');
  return { type: 'ACCOUNT', accountId };
}

function filterTrades(
  trades: readonly AnalyticsTrade[],
  query: GetAnalyticsQuery
): AnalyticsTrade[] {
  const scope = normalizeScope(query.scope);
  const strategyId = String(query.strategyId || '')
    .trim()
    .toUpperCase();
  const strategyVersion = String(query.strategyVersion || '').trim();
  return trades.filter((trade) => {
    if (scope.type === 'ACCOUNT' && trade.accountId !== scope.accountId) return false;
    if (strategyId && trade.strategyId !== strategyId) return false;
    if (strategyVersion && trade.version !== strategyVersion) return false;
    return true;
  });
}

export function calculateAnalyticsFromJournalEntries(
  entries: readonly JournalEntry[],
  generatedAt: string,
  available = true,
  query: GetAnalyticsQuery = {},
  accounts: readonly TradingAccount[] = []
): AnalyticsDto {
  const scope = normalizeScope(query.scope);
  if (!available) return emptyAnalytics(generatedAt, false, scope);

  const trades = entries
    .map(tradeFromEntry)
    .filter((trade): trade is AnalyticsTrade => Boolean(trade));
  const scopedTrades = filterTrades(trades, { ...query, scope });
  if (scopedTrades.length === 0) return emptyAnalytics(generatedAt, true, scope);

  const winners = scopedTrades.filter((trade) => trade.pnl > 0);
  const losers = scopedTrades.filter((trade) => trade.pnl < 0);
  const breakeven = scopedTrades.filter((trade) => calculateOutcome(trade.pnl) === 'BREAKEVEN');
  const totalPnl = sum(scopedTrades.map((trade) => trade.pnl));
  const grossProfit = sum(winners.map((trade) => trade.pnl));
  const grossLoss = sum(losers.map((trade) => trade.pnl));
  const winnerR = winners.map((trade) => trade.r);
  const loserR = losers.map((trade) => trade.r);
  const averageWinnerR = average(winnerR);
  const averageLoserR = average(loserR);
  const winProbability = winners.length / scopedTrades.length;
  const lossProbability = losers.length / scopedTrades.length;

  return {
    generatedAt,
    available: true,
    scope,
    summary: {
      trades: scopedTrades.length,
      wins: winners.length,
      losses: losers.length,
      breakeven: breakeven.length,
      winRate: winners.length / scopedTrades.length,
      profitFactor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
      totalPnl,
      realizedPnl: totalPnl,
      averagePnl: average(scopedTrades.map((trade) => trade.pnl)),
      bestPnl: Math.max(...scopedTrades.map((trade) => trade.pnl)),
      grossProfit,
      grossLoss,
      worstPnl: Math.min(...scopedTrades.map((trade) => trade.pnl)),
      totalR: sum(scopedTrades.map((trade) => trade.r)),
      averageR: average(scopedTrades.map((trade) => trade.r)),
      expectancyR: winProbability * averageWinnerR + lossProbability * averageLoserR,
      averageWinnerR,
      averageLoserR,
      bestR: Math.max(...scopedTrades.map((trade) => trade.r))
    },
    byStrategy: calculateByStrategy(scopedTrades),
    byStrategyVersion: calculateByStrategyVersion(scopedTrades),
    byAccount: calculateByAccount(scopedTrades, accounts)
  };
}

export function createGetAnalytics({
  journalReader,
  now,
  accounts = []
}: GetAnalyticsDependencies) {
  return (query: GetAnalyticsQuery = {}): AnalyticsDto => {
    const generatedAt = now().toISOString();
    try {
      return calculateAnalyticsFromJournalEntries(
        journalReader.findAll(),
        generatedAt,
        true,
        query,
        accounts
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Journal est absent')) {
        return calculateAnalyticsFromJournalEntries([], generatedAt, false, query, accounts);
      }
      throw error;
    }
  };
}
