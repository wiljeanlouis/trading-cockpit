import type { MomentumRankingDto, MomentumRankingItemDto } from '@trading-cockpit/contracts';
import type {
  MomentumRankingReader,
  MomentumRankingRecord
} from '../../../ports/outbound/momentum-ranking-reader';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';
import { watchlistIdentityOf } from '../../domain/watchlist';

export interface GetMomentumRankingDependencies {
  reader: MomentumRankingReader;
  watchlistRepository: WatchlistRepository;
  now: () => Date;
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function itemToDto(
  candidate: MomentumRankingRecord,
  watchlistRepository: WatchlistRepository
): MomentumRankingItemDto {
  const existing = watchlistRepository.findActiveByIdentity(
    watchlistIdentityOf({
      strategyId: candidate.strategyId,
      strategyVersion: candidate.strategyVersion,
      ticker: candidate.ticker
    })
  );

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
    watchlistStatus: existing?.status ?? null
  };
}

export function createGetMomentumRanking({
  reader,
  watchlistRepository,
  now
}: GetMomentumRankingDependencies) {
  return (): MomentumRankingDto => ({
    generatedAt: now().toISOString(),
    items: reader.findAll().map((candidate) => itemToDto(candidate, watchlistRepository))
  });
}
