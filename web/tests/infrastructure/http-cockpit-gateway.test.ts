import { describe, expect, it, vi } from 'vitest';
import {
  HttpCockpitGateway,
  HttpCockpitGatewayError
} from '../../src/infrastructure/http/http-cockpit-gateway';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function createGateway(fetchImpl = vi.fn(async () => jsonResponse({ ok: true }))) {
  return new HttpCockpitGateway({
    getIdToken: () => 'id-token',
    fetchImpl: fetchImpl as typeof fetch
  });
}

describe('HttpCockpitGateway', () => {
  it.each([
    ['getDashboard', 'GET', '/api/dashboard', undefined],
    ['getDashboardSummary', 'GET', '/api/dashboard/summary', undefined],
    ['getWatchlist', 'GET', '/api/watchlist', undefined],
    ['getMomentumRanking', 'GET', '/api/discovery/momentum-ranking', undefined],
    ['getAnalytics', 'GET', '/api/analytics', undefined],
    ['getTradingAccounts', 'GET', '/api/admin/trading-accounts', undefined],
    ['getTradingConfig', 'GET', '/api/admin/trading-config', undefined],
    ['validateStrategies', 'GET', '/api/admin/strategies/validation', undefined],
    ['refreshFinviz', 'POST', '/api/discovery/finviz/refresh-signals', undefined],
    ['refreshMomentumRanking', 'POST', '/api/discovery/momentum-ranking/refresh', undefined],
    [
      'addMomentumCandidateToWatchlist',
      'POST',
      '/api/discovery/momentum-ranking/watchlist',
      {
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-28',
        ticker: 'BOX'
      }
    ],
    ['setupMomentumRanking', 'POST', '/api/admin/momentum-ranking/setup', undefined],
    ['setupStrategies', 'POST', '/api/admin/strategies/setup', undefined],
    ['setupCockpitConfig', 'POST', '/api/admin/trading-config/setup', undefined],
    ['setupTradingAccounts', 'POST', '/api/admin/trading-accounts/setup', undefined],
    [
      'recordCapitalTransaction',
      'POST',
      '/api/admin/capital-transactions',
      { accountId: 'A1', type: 'DEPOSIT', amount: 100, note: 'funding' }
    ],
    ['checkFinvizAuth', 'GET', '/api/admin/finviz/auth', undefined],
    ['setFinvizToken', 'PUT', '/api/admin/finviz/token', 'token'],
    ['deleteFinvizToken', 'DELETE', '/api/admin/finviz/token', undefined],
    [
      'createTradePlan',
      'POST',
      '/api/trade-plans',
      {
        watchlistId: 'W1',
        accountId: 'A1',
        breakoutLevel: 35,
        invalidationLevel: 30,
        eventRisk: null
      }
    ],
    ['getTradePlans', 'GET', '/api/trade-plans', undefined],
    ['executeTradePlan', 'POST', '/api/trade-plans/TP-1/execute', { tradePlanId: 'TP-1' }],
    ['getOpenPositions', 'GET', '/api/positions/open', undefined],
    ['closePosition', 'POST', '/api/positions/P-1/close', { positionId: 'P-1', exitPrice: 36 }],
    ['getJournal', 'GET', '/api/journal', undefined],
    [
      'updateTradePlanPlanning',
      'PATCH',
      '/api/trade-plans/TP-1/planning',
      { tradePlanId: 'TP-1', entryPrice: 34, stopPrice: 30, targetPrice: 42, positionSize: null }
    ]
  ] satisfies Array<[keyof CockpitGateway, string, string, unknown]>)(
    'maps %s to %s %s',
    async (operation, method, path, argument) => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          operation === 'refreshFinviz'
            ? { archived: 12 }
            : operation === 'checkFinvizAuth'
              ? { configured: true }
              : true
        )
      );
      const gateway = createGateway(fetchImpl);

      if (argument === undefined) {
        await (gateway[operation] as () => Promise<unknown>)();
      } else if (operation === 'setFinvizToken') {
        await gateway.setFinvizToken(argument as string);
      } else {
        await (gateway[operation] as (request: unknown) => Promise<unknown>)(argument);
      }

      expect(fetchImpl).toHaveBeenCalledOnce();
      expect(fetchImpl).toHaveBeenCalledWith(
        path,
        expect.objectContaining({
          method,
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: 'Bearer id-token'
          })
        })
      );
    }
  );

  it('serializes JSON request bodies only when a body is provided', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const gateway = createGateway(fetchImpl);

    await gateway.createTradePlan({
      watchlistId: 'W1',
      accountId: 'A1',
      breakoutLevel: null,
      invalidationLevel: 30,
      eventRisk: null
    });
    await gateway.getWatchlist();

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0][1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          watchlistId: 'W1',
          accountId: 'A1',
          breakoutLevel: null,
          invalidationLevel: 30,
          eventRisk: null
        }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    );
    expect(calls[1][1]).not.toHaveProperty('body');
  });

  it('maps HTTP errors and triggers reauthentication for 401 only', async () => {
    const onUnauthorized = vi.fn();
    const gateway = new HttpCockpitGateway({
      getIdToken: () => 'expired-token',
      onUnauthorized,
      fetchImpl: vi.fn(async () =>
        jsonResponse({ error: 'Authentication required.' }, { status: 401 })
      ) as typeof fetch
    });

    await expect(gateway.getWatchlist()).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required.'
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('surfaces authorization failures without reauthentication loops', async () => {
    const onUnauthorized = vi.fn();
    const gateway = new HttpCockpitGateway({
      getIdToken: () => 'valid-but-forbidden',
      onUnauthorized,
      fetchImpl: vi.fn(async () =>
        jsonResponse({ error: 'Forbidden.' }, { status: 403 })
      ) as typeof fetch
    });

    await expect(gateway.getWatchlist()).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden.'
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not automatically retry failed mutations', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'Conflict.' }, { status: 409 })
    ) as unknown as typeof fetch;
    const gateway = new HttpCockpitGateway({ getIdToken: () => 'id-token', fetchImpl });

    await expect(gateway.executeTradePlan({ tradePlanId: 'TP-1' })).rejects.toBeInstanceOf(
      HttpCockpitGatewayError
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('fails locally before HTTP when no ID token is available', async () => {
    const fetchImpl = vi.fn();
    const onUnauthorized = vi.fn();
    const gateway = new HttpCockpitGateway({ getIdToken: () => null, fetchImpl, onUnauthorized });

    await expect(gateway.getWatchlist()).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
