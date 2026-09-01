import {
  getAdminOverviewForCloudRun,
  getTradingAccountsForCloudRun,
  getTradingConfigForCloudRun,
  validateStrategiesForCloudRun
} from '../../composition/admin';
import {
  getDashboardForCloudRun,
  getDashboardSummaryForCloudRun
} from '../../composition/dashboard';
import { getMomentumRankingForCloudRun } from '../../composition/discovery';
import { getTradePlansForCloudRun } from '../../composition/trade-plans';
import { getWatchlistForCloudRun } from '../../composition/watchlist';
import { getOpenPositionsForCloudRun } from '../../composition/positions';
import { getJournalForCloudRun } from '../../composition/journal';
import { getAnalyticsForCloudRun } from '../../composition/analytics';
import { handleTimedQuery } from './query-route';
import type { CloudRunHttpResponse } from '../../app';
import type { SheetsValuesClient } from '../../adapters/outbound/google-sheets-api/google-sheets-api-client';
import type { RequestContext } from '../request-context';

export function isQueryRoute(method: string, pathname: string): boolean {
  return method === 'GET' && Boolean(routeByPath[pathname]);
}

export async function handleQueryRoute(dependencies: {
  context: RequestContext;
  method: string;
  pathname: string;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  spreadsheetId: string;
  now: () => Date;
}): Promise<CloudRunHttpResponse> {
  if (dependencies.method !== 'GET') {
    return {
      statusCode: 404,
      headers: {},
      body: { error: 'Not found' }
    };
  }

  const route = routeByPath[dependencies.pathname];
  if (!route) {
    return {
      statusCode: 404,
      headers: {},
      body: { error: 'Not found' }
    };
  }

  return route(dependencies);
}

type QueryRouteHandler = (dependencies: {
  context: RequestContext;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  spreadsheetId: string;
  now: () => Date;
}) => Promise<CloudRunHttpResponse>;

const routeByPath: Record<string, QueryRouteHandler> = {
  '/api/watchlist': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getWatchlistForCloudRun,
      itemCount: (dto) => dto.items.length
    }),
  '/api/dashboard': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getDashboardForCloudRun
    }),
  '/api/dashboard/summary': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getDashboardSummaryForCloudRun
    }),
  '/api/discovery/momentum-ranking': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getMomentumRankingForCloudRun,
      itemCount: (dto) => dto.items.length
    }),
  '/api/trade-plans': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getTradePlansForCloudRun,
      itemCount: (dto) => dto.items.length
    }),
  '/api/positions/open': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getOpenPositionsForCloudRun,
      itemCount: (dto) => dto.items.length
    }),
  '/api/journal': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getJournalForCloudRun,
      itemCount: (dto) => dto.items.length
    }),
  '/api/analytics': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getAnalyticsForCloudRun
    }),
  '/api/admin/trading-accounts': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getTradingAccountsForCloudRun,
      itemCount: (dto) => dto.accounts.length
    }),
  '/api/admin/overview': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getAdminOverviewForCloudRun,
      itemCount: (dto) => dto.accounts.length
    }),
  '/api/admin/trading-config': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: getTradingConfigForCloudRun
    }),
  '/api/admin/strategies/validation': (dependencies) =>
    handleTimedQuery({
      ...dependencies,
      query: validateStrategiesForCloudRun
    })
};
