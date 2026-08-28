import { describe, expect, it, vi } from 'vitest';
import { executeTradePlanFromWeb } from '../../src/adapters/inbound/apps-script/execute-trade-plan-from-web';
import type { OpenPositionFromTradePlan } from '../../src/core/application/position/open-position-from-trade-plan';
import type { Position } from '../../src/core/domain/position';

const position = {
  id: 'P-1',
  tradePlanId: 'TP-1',
  accountId: 'A1',
  ticker: 'BOX',
  openedAt: new Date('2026-08-28T18:00:00.000Z'),
  actualEntry: 35,
  actualQuantity: 45,
  status: 'OPEN'
} as Position;

describe('Apps Script execute Trade Plan web adapter', () => {
  it('delegates only the Trade Plan identity to the existing use case', () => {
    const execute = vi.fn<OpenPositionFromTradePlan>(() => ({ kind: 'opened', position }));

    expect(executeTradePlanFromWeb(execute, { tradePlanId: 'TP-1' })).toEqual({
      kind: 'opened',
      positionId: 'P-1',
      tradePlanId: 'TP-1',
      accountId: 'A1',
      ticker: 'BOX',
      openedAt: '2026-08-28T18:00:00.000Z',
      actualEntry: 35,
      actualQuantity: 45,
      positionStatus: 'OPEN'
    });
    expect(execute).toHaveBeenCalledWith({ tradePlanId: 'TP-1' });
  });

  it('serializes an existing Position returned by duplicate protection', () => {
    const execute: OpenPositionFromTradePlan = () => ({
      kind: 'duplicate',
      tradePlanId: 'TP-1',
      ticker: 'BOX',
      existing: { ...position, id: 'P-OLD' }
    });
    expect(executeTradePlanFromWeb(execute, { tradePlanId: 'TP-1' })).toMatchObject({
      kind: 'duplicate',
      positionId: 'P-OLD',
      positionStatus: 'OPEN'
    });
  });

  it('does not coerce unavailable persisted values into execution data', () => {
    const execute: OpenPositionFromTradePlan = () => ({
      kind: 'opened',
      position: { ...position, openedAt: '', actualEntry: '', actualQuantity: '' }
    });
    expect(executeTradePlanFromWeb(execute, { tradePlanId: 'TP-1' })).toMatchObject({
      openedAt: null,
      actualEntry: null,
      actualQuantity: null
    });
  });
});
