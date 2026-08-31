import { describe, expect, it, vi } from 'vitest';
import { updateTradePlanPlanningFromWeb } from '../../src/adapters/inbound/apps-script/update-trade-plan-planning-from-web';
import type { TradePlan } from '@trading-cockpit/backend-core/domain/trade-plan';

describe('update Trade Plan planning from Web', () => {
  it('normalizes serializable inputs and returns a concise confirmation', () => {
    const update = vi.fn(() => ({ id: 'TP-1', status: 'DRAFT' }) as TradePlan);
    expect(
      updateTradePlanPlanningFromWeb(update, {
        tradePlanId: ' TP-1 ',
        entryPrice: 35,
        stopPrice: 32,
        targetPrice: null,
        positionSize: 25
      })
    ).toEqual({ tradePlanId: 'TP-1', status: 'DRAFT' });
    expect(update).toHaveBeenCalledWith({
      tradePlanId: ' TP-1 ',
      entryPrice: 35,
      stopPrice: 32,
      targetPrice: null,
      positionSize: 25
    });
  });
});
