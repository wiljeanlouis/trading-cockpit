import type {
  AnalyticsDto,
  AnalyticsStrategyRowDto,
  AnalyticsStrategyVersionRowDto
} from '@trading-cockpit/contracts';
import type { JournalEntry } from '../../domain/journal-entry';
import { calculateOutcome } from '../../domain/journal-entry';
import type { JournalReader } from '../../../ports/outbound/journal-reader';

interface AnalyticsTrade {
  strategyId: string;
  strategy: string;
  version: string;
  pnl: number;
  r: number;
}

export interface GetAnalyticsDependencies {
  journalReader: JournalReader;
  now: () => Date;
}

function emptyAnalytics(generatedAt: string, available: boolean): AnalyticsDto {
  return {
    generatedAt,
    available,
    summary: {
      trades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      winRate: 0,
      profitFactor: null,
      totalPnl: 0,
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
    byStrategyVersion: []
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
  const totalPnl = sum(trades.map((trade) => trade.pnl));
  const totalR = sum(trades.map((trade) => trade.r));
  return {
    trades: trades.length,
    wins: winners.length,
    winRate: trades.length > 0 ? winners.length / trades.length : 0,
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

export function createGetAnalytics({ journalReader, now }: GetAnalyticsDependencies) {
  return (): AnalyticsDto => {
    const generatedAt = now().toISOString();
    let entries: JournalEntry[];
    try {
      entries = journalReader.findAll();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Journal est absent')) {
        return emptyAnalytics(generatedAt, false);
      }
      throw error;
    }

    const trades = entries
      .map(tradeFromEntry)
      .filter((trade): trade is AnalyticsTrade => Boolean(trade));
    if (trades.length === 0) return emptyAnalytics(generatedAt, true);

    const winners = trades.filter((trade) => trade.pnl > 0);
    const losers = trades.filter((trade) => trade.pnl < 0);
    const breakeven = trades.filter((trade) => calculateOutcome(trade.pnl) === 'BREAKEVEN');
    const totalPnl = sum(trades.map((trade) => trade.pnl));
    const grossProfit = sum(winners.map((trade) => trade.pnl));
    const grossLoss = sum(losers.map((trade) => trade.pnl));
    const winnerR = winners.map((trade) => trade.r);
    const loserR = losers.map((trade) => trade.r);
    const averageWinnerR = average(winnerR);
    const averageLoserR = average(loserR);
    const winProbability = winners.length / trades.length;
    const lossProbability = losers.length / trades.length;

    return {
      generatedAt,
      available: true,
      summary: {
        trades: trades.length,
        wins: winners.length,
        losses: losers.length,
        breakeven: breakeven.length,
        winRate: winners.length / trades.length,
        profitFactor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
        totalPnl,
        averagePnl: average(trades.map((trade) => trade.pnl)),
        bestPnl: Math.max(...trades.map((trade) => trade.pnl)),
        grossProfit,
        grossLoss,
        worstPnl: Math.min(...trades.map((trade) => trade.pnl)),
        totalR: sum(trades.map((trade) => trade.r)),
        averageR: average(trades.map((trade) => trade.r)),
        expectancyR: winProbability * averageWinnerR + lossProbability * averageLoserR,
        averageWinnerR,
        averageLoserR,
        bestR: Math.max(...trades.map((trade) => trade.r))
      },
      byStrategy: calculateByStrategy(trades),
      byStrategyVersion: calculateByStrategyVersion(trades)
    };
  };
}
