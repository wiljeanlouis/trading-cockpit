import {
  createWatchlistEntry,
  normalizeWatchlistCandidate,
  watchlistIdentityOf,
  type WatchlistCandidate,
  type WatchlistEntry,
  type WatchlistIdentity
} from '../../domain/watchlist';
import type { RuntimePort } from '../../../ports/outbound/runtime-port';
import type { StrategyRepository } from '../../../ports/outbound/strategy-repository';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';

export type AddCandidateToWatchlistCommand = WatchlistCandidate;

export type AddCandidateToWatchlistResult =
  | {
      kind: 'added';
      entry: WatchlistEntry;
    }
  | {
      kind: 'duplicate';
      identity: WatchlistIdentity;
      existing: WatchlistEntry;
    };

export interface AddCandidateToWatchlistDependencies {
  watchlistRepository: WatchlistRepository;
  strategyRepository: StrategyRepository;
  runtime: RuntimePort;
}

export type AddCandidateToWatchlist = (
  command: AddCandidateToWatchlistCommand
) => AddCandidateToWatchlistResult;

export function createAddCandidateToWatchlist({
  watchlistRepository,
  strategyRepository,
  runtime
}: AddCandidateToWatchlistDependencies): AddCandidateToWatchlist {
  return (command) => {
    const candidate = normalizeWatchlistCandidate(command);

    if (!strategyRepository.existsById(candidate.strategyId)) {
      throw new Error(`Stratégie inconnue : ${candidate.strategyId}`);
    }

    const identity = watchlistIdentityOf(candidate);
    const existing = watchlistRepository.findActiveByIdentity(identity);

    if (existing) {
      return {
        kind: 'duplicate',
        identity,
        existing
      };
    }

    const addedAt = runtime.now();
    const id = runtime.newId();
    const entry = createWatchlistEntry(candidate, id, addedAt);

    watchlistRepository.save(entry);

    return {
      kind: 'added',
      entry
    };
  };
}
