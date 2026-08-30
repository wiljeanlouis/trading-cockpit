import type {
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse
} from '@trading-cockpit/contracts';
import type { AddCandidateToWatchlist } from '../watchlist/add-candidate-to-watchlist';
import type { WatchlistSnapshotValue } from '../../domain/watchlist';
import type { MomentumRankingReader } from '../../../ports/outbound/momentum-ranking-reader';

export interface AddRankedMomentumCandidateToWatchlistDependencies {
  rankingReader: MomentumRankingReader;
  addCandidateToWatchlist: AddCandidateToWatchlist;
}

function toWatchlistSnapshotValue(value: unknown): WatchlistSnapshotValue {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  return String(value ?? '');
}

export function createAddRankedMomentumCandidateToWatchlist({
  rankingReader,
  addCandidateToWatchlist
}: AddRankedMomentumCandidateToWatchlistDependencies) {
  return (
    request: AddMomentumCandidateToWatchlistRequest
  ): AddMomentumCandidateToWatchlistResponse => {
    const identity = {
      strategyId: String(request.strategyId || '')
        .trim()
        .toUpperCase(),
      strategyVersion: String(request.strategyVersion || '').trim(),
      signalDate: String(request.signalDate || '').trim(),
      ticker: String(request.ticker || '')
        .trim()
        .toUpperCase()
    };

    if (!identity.strategyId) throw new Error('Strategy ID absent.');
    if (!identity.strategyVersion) throw new Error('Strategy Version absent.');
    if (!identity.signalDate) throw new Error('Signal Date absente.');
    if (!identity.ticker) throw new Error('Ticker absent.');

    const candidate = rankingReader.findByIdentity(identity);
    if (!candidate) {
      throw new Error(
        `Candidat Momentum introuvable : ${identity.strategyId} ${identity.strategyVersion} ${identity.signalDate} ${identity.ticker}`
      );
    }

    const result = addCandidateToWatchlist({
      strategyId: candidate.strategyId,
      strategyName: candidate.strategy,
      strategyVersion: candidate.strategyVersion,
      signalDate: candidate.signalDate,
      ticker: candidate.ticker,
      company: toWatchlistSnapshotValue(candidate.company),
      sector: toWatchlistSnapshotValue(candidate.sector),
      signalPrice: candidate.price,
      momentumScore: candidate.total
    });

    if (result.kind === 'duplicate') {
      return {
        kind: 'duplicate',
        watchlistId: result.existing.id,
        ticker: result.existing.ticker,
        status: result.existing.status
      };
    }

    return {
      kind: 'added',
      watchlistId: result.entry.id,
      ticker: result.entry.ticker,
      status: result.entry.status
    };
  };
}
