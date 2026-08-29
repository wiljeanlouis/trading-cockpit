import { describe, expect, it, vi } from 'vitest';
import { closePositionFromWeb } from '../../src/adapters/inbound/apps-script/close-position-from-web';
import { openPosition } from '../fixtures/position';

describe('close Position from Web', () => {
  it('delegates the typed command and serializes the backend-confirmed result', () => {
    const close = vi.fn(() => ({
      position: {
        ...openPosition,
        status: 'CLOSED',
        closedAt: new Date('2026-08-28T18:00:00.000Z'),
        exitPrice: 12,
        realizedPnl: 10
      },
      journalEntry: null,
      journalCreated: true
    }));

    expect(closePositionFromWeb(close, { positionId: ' P-1 ', exitPrice: 12 })).toEqual({
      positionId: 'P-1',
      accountId: openPosition.accountId,
      ticker: openPosition.ticker,
      status: 'CLOSED',
      closedAt: '2026-08-28T18:00:00.000Z',
      exitPrice: 12,
      realizedPnl: 10,
      journalCreated: true
    });
    expect(close).toHaveBeenCalledWith({ positionId: 'P-1', exitPrice: 12 });
  });
});
