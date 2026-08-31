import { describe, expect, it } from 'vitest';
import {
  createClosePosition,
  type ClosePositionDependencies
} from '@trading-cockpit/backend-core/application/position/close-position';
import type { JournalEntry } from '@trading-cockpit/backend-core/domain/journal-entry';
import type { Position } from '@trading-cockpit/backend-core/domain/position';
import { openPosition } from '../fixtures/position';

function context(options?: { position?: Position | null; journal?: JournalEntry | null }) {
  const calls: string[] = [];
  let closed: Position | null = null;
  let savedJournal: JournalEntry | null = null;
  const dependencies: ClosePositionDependencies = {
    positionRepository: {
      findById: () => {
        calls.push('position.find');
        return options?.position === undefined ? openPosition : options.position;
      },
      findOpenByTradePlanId: () => null,
      save: () => undefined,
      close: (position) => {
        calls.push('position.close');
        closed = position;
      }
    },
    journalRepository: {
      findClosedByAccountId: () => [],
      findByPositionId: () => {
        calls.push('journal.find');
        return options?.journal ?? null;
      },
      findAllByPositionId: () => (options?.journal ? [options.journal] : []),
      save: (entry) => {
        calls.push('journal.save');
        savedJournal = entry;
      }
    },
    watchlistRepository: {
      findById: () => null,
      findActiveByIdentity: () => null,
      save: () => undefined,
      updateTradePlanningInputs: () => undefined,
      updateStatus: () => calls.push('watchlist.update')
    },
    runtime: {
      now: () => {
        calls.push('runtime.now');
        return new Date('2026-08-27T14:00:00Z');
      },
      newId: () => {
        calls.push('runtime.newId');
        return 'J-1';
      }
    }
  };
  return { dependencies, calls, closed: () => closed, savedJournal: () => savedJournal };
}

describe('close Position', () => {
  it('blocks a legacy Position without Account ID before closing it', () => {
    const c = context({ position: { ...openPosition, accountId: '' } });
    expect(() => createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 })).toThrow(
      'Account ID absent.'
    );
    expect(c.calls).toEqual(['position.find']);
  });
  it.each([
    [12, 10],
    [8, -10],
    [10, 0]
  ])('closes at %s with P&L %s in legacy order', (exitPrice, pnl) => {
    const c = context();
    const result = createClosePosition(c.dependencies)({ positionId: ' P-1 ', exitPrice });
    expect(result.position.realizedPnl).toBe(pnl);
    expect(c.calls).toEqual([
      'position.find',
      'runtime.now',
      'position.close',
      'journal.find',
      'runtime.newId',
      'journal.save',
      'watchlist.update'
    ]);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid exit %s before ports',
    (exitPrice) => {
      const c = context();
      expect(() => createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice })).toThrow(
        'Le prix de sortie doit être supérieur à 0.'
      );
      expect(c.calls).toEqual([]);
    }
  );
  it('rejects absent Position', () => {
    const c = context({ position: null });
    expect(() =>
      createClosePosition(c.dependencies)({ positionId: 'P-404', exitPrice: 12 })
    ).toThrow('Position ID introuvable : P-404');
  });
  it.each(['CLOSED', 'STOPPED', 'TARGET HIT'])('rejects status %s without mutation', (status) => {
    const c = context({ position: { ...openPosition, status } });
    expect(() =>
      createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 })
    ).toThrow();
    expect(c.calls).toEqual(['position.find', 'runtime.now']);
  });
  it('does not duplicate an existing Journal but still closes and updates Watchlist', () => {
    const existing = { id: 'J-old', positionId: 'P-1' } as JournalEntry;
    const c = context({ journal: existing });
    const result = createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 });
    expect(result.journalCreated).toBe(false);
    expect(c.calls).not.toContain('journal.save');
    expect(c.calls).not.toContain('runtime.newId');
  });
  it('stops after Position failure', () => {
    const c = context();
    c.dependencies.positionRepository.close = () => {
      throw new Error('position failed');
    };
    expect(() => createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 })).toThrow(
      'position failed'
    );
    expect(c.calls).not.toContain('journal.find');
  });
  it('exposes terminal Position without Journal when Journal save fails; retry cannot duplicate', () => {
    const c = context();
    const events: Array<{ event: string; fields: Record<string, unknown> }> = [];
    c.dependencies.observe = (event, fields) => events.push({ event, fields });
    c.dependencies.journalRepository.save = () => {
      throw new Error('journal failed');
    };
    expect(() => createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 })).toThrow(
      'journal failed'
    );
    const retry = context({ position: c.closed() });
    expect(() =>
      createClosePosition(retry.dependencies)({ positionId: 'P-1', exitPrice: 12 })
    ).toThrow("URNB n'est pas une position OPEN.");
    expect(retry.calls).not.toContain('journal.save');
    expect(events).toContainEqual({
      event: 'PARTIAL_FAILURE',
      fields: {
        stage: 'JOURNAL_CREATION',
        positionId: 'P-1',
        errorMessage: 'journal failed'
      }
    });
  });
  it('exposes Position and Journal if Watchlist update fails', () => {
    const c = context();
    c.dependencies.watchlistRepository.updateStatus = () => {
      throw new Error('watchlist failed');
    };
    expect(() => createClosePosition(c.dependencies)({ positionId: 'P-1', exitPrice: 12 })).toThrow(
      'watchlist failed'
    );
    expect(c.closed()).not.toBeNull();
    expect(c.savedJournal()).not.toBeNull();
  });
});
