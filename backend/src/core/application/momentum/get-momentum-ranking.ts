import type { MomentumRankingDto, MomentumRankingItemDto } from '@trading-cockpit/contracts';
import type {
  MomentumRankingReader,
  MomentumRankingRecord
} from '../../../ports/outbound/momentum-ranking-reader';
import type { WatchlistReader } from '../../../ports/outbound/watchlist-reader';
import { isActiveWatchlistStatus, watchlistIdentityOf } from '../../domain/watchlist';

export interface GetMomentumRankingDependencies {
  reader: MomentumRankingReader;
  watchlistReader: WatchlistReader;
  now: () => Date;
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function watchlistIdentityKey(identity: ReturnType<typeof watchlistIdentityOf>): string {
  return `${identity.strategyId}|${identity.strategyVersion}|${identity.ticker}`;
}

function itemToDto(
  candidate: MomentumRankingRecord,
  activeWatchlistStatuses: ReadonlyMap<string, string>
): MomentumRankingItemDto {
  const identity = watchlistIdentityOf({
    strategyId: candidate.strategyId,
    strategyVersion: candidate.strategyVersion,
    ticker: candidate.ticker
  });

  return {
    strategyId: candidate.strategyId,
    strategyName: candidate.strategy,
    strategyVersion: candidate.strategyVersion,
    signalDate: nullableText(candidate.signalDate),
    ticker: candidate.ticker,
    company: nullableText(candidate.company),
    sector: nullableText(candidate.sector),
    price: nullableNumber(candidate.price),
    high52: nullableNumber(candidate.high52),
    high52Score: nullableNumber(candidate.high52Score),
    relativeVolume: nullableNumber(candidate.relativeVolume),
    relativeVolumeScore: nullableNumber(candidate.relativeVolumeScore),
    performanceMonth: nullableNumber(candidate.performanceMonth),
    performanceScore: nullableNumber(candidate.performanceScore),
    rsi: nullableNumber(candidate.rsi),
    rsiScore: nullableNumber(candidate.rsiScore),
    sma20: nullableNumber(candidate.sma20),
    sma20Score: nullableNumber(candidate.sma20Score),
    momentumScore: nullableNumber(candidate.total),
    reviewStatus: candidate.reviewStatus,
    watchlistStatus: activeWatchlistStatuses.get(watchlistIdentityKey(identity)) ?? null
  };
}

export function createGetMomentumRanking({
  reader,
  watchlistReader,
  now
}: GetMomentumRankingDependencies) {
  return (): MomentumRankingDto => {
    const activeWatchlistStatuses = new Map<string, string>();
    for (const entry of watchlistReader.findAll()) {
      if (!isActiveWatchlistStatus(entry.status)) continue;
      const key = watchlistIdentityKey(watchlistIdentityOf(entry));
      if (!activeWatchlistStatuses.has(key)) {
        activeWatchlistStatuses.set(key, entry.status);
      }
    }

    return {
      generatedAt: now().toISOString(),
      items: reader.findAll().map((candidate) => itemToDto(candidate, activeWatchlistStatuses))
    };
  };
}
