import type { WatchlistDto, WatchlistItemDto } from '@trading-cockpit/contracts';
import type { WatchlistSnapshotValue } from '../../domain/watchlist';
import type { WatchlistReader } from '../../../ports/outbound/watchlist-reader';

export interface GetWatchlistDependencies {
  reader: WatchlistReader;
  now: () => Date;
}

export type GetWatchlist = () => WatchlistDto;

function nullableText(value: WatchlistSnapshotValue): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: WatchlistSnapshotValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializedDate(value: WatchlistSnapshotValue): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return nullableText(value);
}

export function createGetWatchlist({ reader, now }: GetWatchlistDependencies): GetWatchlist {
  return () => {
    const items: WatchlistItemDto[] = reader.findAll().map((entry) => ({
      id: entry.id,
      ticker: entry.ticker,
      company: nullableText(entry.company),
      sector: nullableText(entry.sector),
      strategyId: entry.strategyId,
      strategyName: entry.strategyName,
      strategyVersion: entry.strategyVersion,
      signalDate: serializedDate(entry.signalDate),
      signalPrice: nullableNumber(entry.signalPrice),
      currentPrice: nullableNumber(entry.currentPrice),
      momentumScore: nullableNumber(entry.momentumScore),
      status: entry.status,
      setupStatus: entry.setupStatus,
      breakoutLevel: nullableNumber(entry.breakoutLevel),
      invalidationLevel: nullableNumber(entry.invalidationLevel),
      earningsDate: serializedDate(entry.earningsDate),
      eventRisk: nullableText(entry.eventRisk),
      notes: nullableText(entry.notes)
    }));

    return {
      generatedAt: now().toISOString(),
      items
    };
  };
}
