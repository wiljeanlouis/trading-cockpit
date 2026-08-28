import { describe, expect, it } from 'vitest';
import {
  createReconcileClosedPosition,
  type ReconcileClosedPositionDependencies
} from '../../src/core/application/position/reconcile-closed-position';
import type { JournalEntry } from '../../src/core/domain/journal-entry';
import type { Position } from '../../src/core/domain/position';
import type { WatchlistEntry } from '../../src/core/domain/watchlist';
import { openPosition } from '../fixtures/position';

const closedPosition: Position = {
  ...openPosition,
  status: 'CLOSED',
  closedAt: new Date('2026-08-27T14:00:00Z'),
  exitPrice: 12,
  realizedPnl: 10
};

const watchlist = {
  id: 'WL-1',
  status: 'ENTERED'
} as WatchlistEntry;

function context(options?: {
  position?: Position | null;
  journals?: JournalEntry[];
  watchlist?: WatchlistEntry | null;
}) {
  const calls: string[] = [];
  const savedJournals: JournalEntry[] = [];
  const watchlistUpdates: Array<{ id: string; status: string }> = [];
  const dependencies: ReconcileClosedPositionDependencies = {
    positionRepository: {
      findById: () => {
        calls.push('position.find');
        return options?.position === undefined ? closedPosition : options.position;
      },
      findOpenByTradePlanId: () => null,
      save: () => undefined,
      close: () => undefined
    },
    journalRepository: {
      findClosedByAccountId: () => [],
      findByPositionId: () => null,
      findAllByPositionId: () => {
        calls.push('journal.findAll');
        return options?.journals ?? [];
      },
      save: (entry) => {
        calls.push('journal.save');
        savedJournals.push(entry);
      }
    },
    watchlistRepository: {
      findById: () => {
        calls.push('watchlist.find');
        return options?.watchlist === undefined ? watchlist : options.watchlist;
      },
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateStatus: (id, status) => {
        calls.push('watchlist.update');
        watchlistUpdates.push({ id, status });
      }
    },
    runtime: {
      now: () => {
        calls.push('runtime.now');
        return new Date();
      },
      newId: () => {
        calls.push('runtime.newId');
        return 'J-NEW';
      }
    }
  };

  return { dependencies, calls, savedJournals, watchlistUpdates };
}

describe('reconcile CLOSED Position', () => {
  it('creates missing Journal then closes stale Watchlist in order', () => {
    const c = context();
    const result = createReconcileClosedPosition(c.dependencies)({ positionId: ' P-1 ' });

    expect(result).toEqual({
      positionId: 'P-1',
      journal: 'CREATED',
      watchlist: 'UPDATED',
      status: 'RECONCILED',
      diagnostics: []
    });
    expect(c.calls).toEqual([
      'position.find',
      'journal.findAll',
      'runtime.newId',
      'journal.save',
      'watchlist.find',
      'watchlist.update'
    ]);
    expect(c.savedJournals[0]).toMatchObject({
      id: 'J-NEW',
      positionId: 'P-1',
      accountId: 'A1',
      closedAt: closedPosition.closedAt,
      realizedPnl: 10
    });
    expect(c.calls).not.toContain('runtime.now');
  });

  it('keeps existing Journal and closes stale Watchlist', () => {
    const existing = { id: 'J-1', positionId: 'P-1' } as JournalEntry;
    const c = context({ journals: [existing] });
    const result = createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' });

    expect(result).toMatchObject({
      journal: 'ALREADY_PRESENT',
      watchlist: 'UPDATED',
      status: 'RECONCILED'
    });
    expect(c.calls).not.toContain('runtime.newId');
    expect(c.calls).not.toContain('journal.save');
  });

  it('is a no-op when Journal and Watchlist are already consistent', () => {
    const existing = { id: 'J-1', positionId: 'P-1' } as JournalEntry;
    const c = context({ journals: [existing], watchlist: { ...watchlist, status: ' closed ' } });

    expect(createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' })).toMatchObject({
      journal: 'ALREADY_PRESENT',
      watchlist: 'ALREADY_CLOSED',
      status: 'NO_ACTION'
    });
    expect(c.calls).not.toContain('watchlist.update');
  });

  it.each(['OPEN', 'STOPPED', 'TARGET HIT'])('blocks non-CLOSED status %s', (status) => {
    const c = context({ position: { ...closedPosition, status } });
    const result = createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' });

    expect(result.status).toBe('BLOCKED');
    expect(c.calls).toEqual(['position.find']);
  });

  it('returns a diagnostic when Position is absent', () => {
    const c = context({ position: null });
    expect(createReconcileClosedPosition(c.dependencies)({ positionId: 'P-404' })).toEqual({
      positionId: 'P-404',
      journal: 'NOT_CHECKED',
      watchlist: 'NOT_UPDATED',
      status: 'BLOCKED',
      diagnostics: ['Position ID introuvable : P-404']
    });
  });

  it.each([
    ['tradePlanId', ''],
    ['watchlistId', ''],
    ['strategyId', ''],
    ['strategyName', ''],
    ['strategyVersion', ''],
    ['ticker', ''],
    ['closedAt', ''],
    ['actualEntry', ''],
    ['exitPrice', ''],
    ['actualQuantity', ''],
    ['realizedPnl', '']
  ] as const)('blocks insufficient snapshot %s', (field, value) => {
    const c = context({ position: { ...closedPosition, [field]: value } });
    const result = createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' });
    expect(result).toMatchObject({ status: 'BLOCKED', journal: 'NOT_CHECKED' });
    expect(result.diagnostics[0]).toContain('Snapshot Position insuffisant');
    expect(c.calls).toEqual(['position.find']);
  });

  it('reports duplicate Journals without changing anything', () => {
    const duplicates = [
      { id: 'J-1', positionId: 'P-1' },
      { id: 'J-2', positionId: 'P-1' }
    ] as JournalEntry[];
    const c = context({ journals: duplicates });
    const result = createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' });

    expect(result).toMatchObject({
      journal: 'INCONSISTENT',
      watchlist: 'NOT_UPDATED',
      status: 'BLOCKED'
    });
    expect(c.calls).toEqual(['position.find', 'journal.findAll']);
  });

  it('does not inspect or update Watchlist when Journal creation fails', () => {
    const c = context();
    c.dependencies.journalRepository.save = () => {
      throw new Error('journal failed');
    };

    expect(() => createReconcileClosedPosition(c.dependencies)({ positionId: 'P-1' })).toThrow(
      'journal failed'
    );
    expect(c.calls).not.toContain('watchlist.find');
    expect(c.calls).not.toContain('watchlist.update');
  });

  it('can finish Watchlist repair on retry after its first update failed', () => {
    const first = context();
    first.dependencies.watchlistRepository.updateStatus = () => {
      throw new Error('watchlist failed');
    };
    expect(() => createReconcileClosedPosition(first.dependencies)({ positionId: 'P-1' })).toThrow(
      'watchlist failed'
    );
    expect(first.savedJournals).toHaveLength(1);

    const retry = context({ journals: first.savedJournals });
    const result = createReconcileClosedPosition(retry.dependencies)({ positionId: 'P-1' });
    expect(result).toMatchObject({ journal: 'ALREADY_PRESENT', watchlist: 'UPDATED' });
    expect(retry.calls).not.toContain('journal.save');
  });

  it('is idempotent across repair then repeated reconciliation', () => {
    const first = context();
    createReconcileClosedPosition(first.dependencies)({ positionId: 'P-1' });
    const second = context({
      journals: first.savedJournals,
      watchlist: { ...watchlist, status: 'CLOSED' }
    });

    expect(createReconcileClosedPosition(second.dependencies)({ positionId: 'P-1' })).toMatchObject(
      {
        status: 'NO_ACTION'
      }
    );
    expect(second.calls).not.toContain('journal.save');
    expect(second.calls).not.toContain('watchlist.update');
  });
});
