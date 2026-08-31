import { describe, expect, it, vi } from 'vitest';
import {
  createTradePlanFromWeb,
  tradingAccountsToDto
} from '../../src/adapters/inbound/apps-script/create-trade-plan-from-web';
import type { CreateTradePlanFromWatchlist } from '@trading-cockpit/backend-core/application/trade-plan/create-trade-plan-from-watchlist';
import type { TradePlan } from '@trading-cockpit/backend-core/domain/trade-plan';

const plan = {
  id: 'TP-1',
  watchlistId: 'WL-1',
  ticker: 'BOX',
  accountId: 'A1',
  status: 'DRAFT'
} as TradePlan;

describe('Apps Script Trade Plan web adapter', () => {
  it('delegates the typed command to the existing application use case', () => {
    const create = vi.fn<CreateTradePlanFromWatchlist>(() => ({
      kind: 'created',
      tradePlan: plan
    }));

    expect(
      createTradePlanFromWeb(create, {
        watchlistId: 'WL-1',
        accountId: 'A1',
        breakoutLevel: 101,
        invalidationLevel: 95,
        eventRisk: 'CLEAR'
      })
    ).toEqual({
      kind: 'created',
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      accountId: 'A1',
      status: 'DRAFT'
    });
    expect(create).toHaveBeenCalledWith({
      watchlistId: 'WL-1',
      accountId: 'A1',
      breakoutLevel: 101,
      invalidationLevel: 95,
      eventRisk: 'CLEAR'
    });
  });

  it('serializes account-scoped duplicates without reporting a creation', () => {
    const create: CreateTradePlanFromWatchlist = () => ({
      kind: 'duplicate',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      existing: { ...plan, id: 'TP-OLD' }
    });

    expect(
      createTradePlanFromWeb(create, {
        watchlistId: 'WL-1',
        accountId: 'A1',
        breakoutLevel: null,
        invalidationLevel: 95,
        eventRisk: null
      })
    ).toMatchObject({
      kind: 'duplicate',
      tradePlanId: 'TP-OLD',
      accountId: 'A1'
    });
  });

  it('returns only serializable account identity and display fields', () => {
    expect(tradingAccountsToDto([{ id: 'A1', name: 'Primary', baseCurrency: 'CAD' }])).toEqual({
      accounts: [{ id: 'A1', name: 'Primary', baseCurrency: 'CAD' }]
    });
  });
});
