import { describe, expect, it, vi } from 'vitest';
import { createUpdateTradePlanPlanning } from '@trading-cockpit/backend-core/application/trade-plan/update-trade-plan-planning';
import type { TradePlan } from '@trading-cockpit/backend-core/domain/trade-plan';

const plan = {
  id: 'TP-1',
  ticker: 'BOX',
  status: 'DRAFT',
  accountEquity: 10_000,
  riskPercent: 0.01
} as TradePlan;

describe('update Trade Plan planning', () => {
  it('loads, calculates and persists through the Trade Plan repository', () => {
    const updatePlanning = vi.fn();
    const useCase = createUpdateTradePlanPlanning({
      findById: () => plan,
      findActiveByWatchlistIdAndAccountId: () => null,
      save: () => undefined,
      updatePlanning,
      updateStatus: () => undefined
    });

    const result = useCase({
      tradePlanId: ' TP-1 ',
      entryPrice: 35,
      stopPrice: 32.5,
      targetPrice: 40,
      positionSize: null
    });
    expect(result).toMatchObject({
      riskPerShare: 2.5,
      rewardPerShare: 5,
      riskReward: 2,
      positionSize: 40,
      positionValue: 1400
    });
    expect(updatePlanning).toHaveBeenCalledWith(result, { positionSizeOverridden: false });
  });

  it('rejects an unknown Trade Plan before persistence', () => {
    const useCase = createUpdateTradePlanPlanning({
      findById: () => null,
      findActiveByWatchlistIdAndAccountId: () => null,
      save: () => undefined,
      updatePlanning: vi.fn(),
      updateStatus: () => undefined
    });
    expect(() =>
      useCase({
        tradePlanId: 'TP-404',
        entryPrice: 35,
        stopPrice: 32,
        targetPrice: null,
        positionSize: null
      })
    ).toThrow('Trade Plan ID introuvable : TP-404');
  });

  it('marks an explicit Position Size so the adapter can replace the Sheet formula', () => {
    const updatePlanning = vi.fn();
    const useCase = createUpdateTradePlanPlanning({
      findById: () => plan,
      findActiveByWatchlistIdAndAccountId: () => null,
      save: () => undefined,
      updatePlanning,
      updateStatus: () => undefined
    });

    const result = useCase({
      tradePlanId: 'TP-1',
      entryPrice: 35,
      stopPrice: 32.5,
      targetPrice: 40,
      positionSize: 25
    });

    expect(result).toMatchObject({ positionSize: 25, positionValue: 875 });
    expect(updatePlanning).toHaveBeenCalledWith(result, { positionSizeOverridden: true });
  });
});
