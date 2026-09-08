import type {
  AddDiscoveryCandidateToWatchlistRequest,
  AddDiscoveryCandidateToWatchlistResponse
} from '@trading-cockpit/contracts';
import type { SignalSnapshot } from '../../domain/market-signal';
import type { WatchlistSnapshotValue } from '../../domain/watchlist';
import type { AddCandidateToWatchlist } from '../watchlist/add-candidate-to-watchlist';
import type { DiscoverySignalReader } from '../../ports/outbound/discovery-signal-reader';

export interface AddDiscoveryCandidateToWatchlistDependencies {
  signalReader: DiscoverySignalReader;
  addCandidateToWatchlist: AddCandidateToWatchlist;
}

function toWatchlistSnapshotValue(value: unknown): WatchlistSnapshotValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  return String(value);
}

function normalizeIdentity(request: AddDiscoveryCandidateToWatchlistRequest) {
  return {
    strategyId: String(request.strategyId || '')
      .trim()
      .toUpperCase(),
    strategyVersion: String(request.strategyVersion || '').trim(),
    signalDate: String(request.signalDate || '').trim(),
    ticker: String(request.ticker || '')
      .trim()
      .toUpperCase()
  };
}

/**
 * Resolves the React-selected candidate identity against authoritative Signals History snapshots.
 * React sends identity only; backend-owned signal attributes are used to create Watchlist data.
 */
function findCandidate(
  snapshots: readonly SignalSnapshot[],
  identity: ReturnType<typeof normalizeIdentity>
): SignalSnapshot | null {
  return (
    snapshots.find(
      (snapshot) =>
        snapshot.strategyId.toUpperCase() === identity.strategyId &&
        snapshot.strategyVersion === identity.strategyVersion &&
        snapshot.signalDate === identity.signalDate &&
        snapshot.ticker.toUpperCase() === identity.ticker
    ) ?? null
  );
}

/**
 * Adds a Discovery candidate to Watchlist through the existing Watchlist use case, preserving the
 * active duplicate rule and avoiding trust in client-provided market/provider fields.
 */
export function createAddDiscoveryCandidateToWatchlist({
  signalReader,
  addCandidateToWatchlist
}: AddDiscoveryCandidateToWatchlistDependencies) {
  return (
    request: AddDiscoveryCandidateToWatchlistRequest
  ): AddDiscoveryCandidateToWatchlistResponse => {
    const identity = normalizeIdentity(request);
    if (!identity.strategyId) throw new Error('Strategy ID absent.');
    if (!identity.strategyVersion) throw new Error('Strategy Version absent.');
    if (!identity.signalDate) throw new Error('Signal Date absente.');
    if (!identity.ticker) throw new Error('Ticker absent.');

    const candidate = findCandidate(signalReader.findAllSignals(), identity);
    if (!candidate) {
      throw new Error(
        `Candidat Discovery introuvable : ${identity.strategyId} ${identity.strategyVersion} ${identity.signalDate} ${identity.ticker}`
      );
    }

    const result = addCandidateToWatchlist({
      strategyId: candidate.strategyId,
      strategyName: candidate.strategyName,
      strategyVersion: candidate.strategyVersion,
      signalDate: candidate.signalDate,
      ticker: candidate.ticker,
      company: toWatchlistSnapshotValue(candidate.attributes.Company),
      sector: toWatchlistSnapshotValue(candidate.attributes.Sector),
      signalPrice: toWatchlistSnapshotValue(candidate.attributes.Price),
      momentumScore: null
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
