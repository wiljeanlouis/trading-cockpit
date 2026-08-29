import { describe, expect, it } from 'vitest';
import {
  createAddCandidateToWatchlist,
  type AddCandidateToWatchlistCommand
} from '../../src/core/application/watchlist/add-candidate-to-watchlist';
import type { WatchlistEntry, WatchlistIdentity } from '../../src/core/domain/watchlist';
import type { RuntimePort } from '../../src/ports/outbound/runtime-port';
import type { StrategyRepository } from '../../src/ports/outbound/strategy-repository';
import type { WatchlistRepository } from '../../src/ports/outbound/watchlist-repository';

const command: AddCandidateToWatchlistCommand = {
  strategyId: ' momentum_breakout ',
  strategyName: ' Momentum Breakout ',
  strategyVersion: ' V1 ',
  signalDate: '2026-08-27',
  ticker: ' urnb ',
  company: 'Urban Outfitters',
  sector: 'Consumer Cyclical',
  signalPrice: 54.25,
  momentumScore: 88
};

function createDependencies(existing: WatchlistEntry | null = null) {
  const calls: string[] = [];
  let searchedIdentity: WatchlistIdentity | null = null;
  let savedEntry: WatchlistEntry | null = null;

  const watchlistRepository: WatchlistRepository = {
    findById: () => null,
    findActiveByIdentity: (identity) => {
      calls.push('watchlist.find');
      searchedIdentity = identity;
      return existing;
    },
    save: (entry) => {
      calls.push('watchlist.save');
      savedEntry = entry;
    },
    updateTradePlanningInputs: () => undefined,
    updateStatus: () => undefined
  };
  const strategyRepository: StrategyRepository = {
    existsById: () => {
      calls.push('strategy.exists');
      return true;
    }
  };
  const runtime: RuntimePort = {
    now: () => {
      calls.push('runtime.now');
      return new Date('2026-08-27T14:00:00.000Z');
    },
    newId: () => {
      calls.push('runtime.newId');
      return 'watchlist-id';
    }
  };

  return {
    calls,
    watchlistRepository,
    strategyRepository,
    runtime,
    searchedIdentity: () => searchedIdentity,
    savedEntry: () => savedEntry
  };
}

describe('add candidate to Watchlist', () => {
  it('validates strategy, checks duplicate, uses runtime, and saves in legacy order', () => {
    const dependencies = createDependencies();
    const addCandidate = createAddCandidateToWatchlist(dependencies);

    const result = addCandidate(command);

    expect(result.kind).toBe('added');
    expect(dependencies.calls).toEqual([
      'strategy.exists',
      'watchlist.find',
      'runtime.now',
      'runtime.newId',
      'watchlist.save'
    ]);
    expect(dependencies.searchedIdentity()).toEqual({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      ticker: 'URNB'
    });
    expect(dependencies.savedEntry()).toMatchObject({
      id: 'watchlist-id',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'URNB',
      status: 'WATCHING'
    });
  });

  it('returns duplicate without using runtime or saving', () => {
    const existing = {
      id: 'existing-id',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-20',
      ticker: 'URNB',
      company: '',
      sector: '',
      addedAt: new Date('2026-08-20T14:00:00.000Z'),
      signalPrice: 50,
      currentPrice: 51,
      momentumScore: 80,
      status: 'WATCHING',
      setupStatus: '',
      breakoutLevel: '',
      invalidationLevel: '',
      earningsDate: '',
      eventRisk: '',
      notes: '',
      closedAt: ''
    } satisfies WatchlistEntry;
    const dependencies = createDependencies(existing);
    const addCandidate = createAddCandidateToWatchlist(dependencies);

    const result = addCandidate(command);

    expect(result).toEqual({
      kind: 'duplicate',
      identity: {
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        ticker: 'URNB'
      },
      existing
    });
    expect(dependencies.calls).toEqual(['strategy.exists', 'watchlist.find']);
    expect(dependencies.savedEntry()).toBeNull();
  });

  it('rejects an unknown strategy before opening the Watchlist', () => {
    const dependencies = createDependencies();
    dependencies.strategyRepository.existsById = () => false;
    const addCandidate = createAddCandidateToWatchlist(dependencies);

    expect(() => addCandidate(command)).toThrow('Stratégie inconnue : MOMENTUM_BREAKOUT');
    expect(dependencies.calls).toEqual([]);
    expect(dependencies.savedEntry()).toBeNull();
  });

  it('rejects invalid input before calling any port', () => {
    const dependencies = createDependencies();
    const addCandidate = createAddCandidateToWatchlist(dependencies);

    expect(() => addCandidate({ ...command, ticker: '' })).toThrow(
      'Ticker absent de la ligne sélectionnée.'
    );
    expect(dependencies.calls).toEqual([]);
  });
});
