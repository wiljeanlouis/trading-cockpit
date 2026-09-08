import type { CloudRunHttpResponse } from '../../app';
import type { SheetsValuesClient } from '../../adapters/outbound/google-sheets-api/google-sheets-api-client';
import { createQueryContext } from '../../composition/query-context';
import {
  DeferredSheetsWriter,
  type MutationContext
} from '../../adapters/outbound/google-sheets-api/cockpit-mutation-repositories';
import {
  checkFinvizAuthMutationForCloudRun,
  createStrategyForCloudRun,
  createStrategyVersionForCloudRun,
  createFundedTradingAccountForCloudRun,
  createTradingAccountForCloudRun,
  deleteFinvizTokenForCloudRun,
  recordCapitalTransactionForCloudRun,
  setFinvizTokenForCloudRun,
  setupStrategiesForCloudRun,
  setupTradingAccountsForCloudRun,
  updateStrategyForCloudRun,
  updateStrategyVersionForCloudRun,
  updateTradingAccountForCloudRun
} from '../../composition/admin';
import {
  refreshAllSignalsForCloudRun,
  refreshSignalsForCloudRun
} from '../../composition/discovery';
import { addDiscoveryCandidateToWatchlistForCloudRun } from '../../composition/watchlist';
import {
  createTradePlanForCloudRun,
  updateTradePlanPlanningForCloudRun
} from '../../composition/trade-plans';
import { closePositionForCloudRun, executeTradePlanForCloudRun } from '../../composition/positions';
import { elapsedMs, nowMs } from '../../timing';
import { ValidationError } from '../errors';
import type { RequestContext } from '../request-context';

type MutationHandler = (dependencies: {
  context: RequestContext;
  mutationContext: MutationContext;
  body: Record<string, unknown>;
  now: () => Date;
}) => Promise<unknown>;

interface RouteMatch {
  handler: MutationHandler;
  pathParams?: Record<string, string>;
}

export function isMutationRoute(method: string, pathname: string): boolean {
  return Boolean(matchMutationRoute(method, pathname));
}

/**
 * Handles workflow-changing API routes with one request-scoped reader cache and one deferred
 * writer, keeping read-modify-write behavior coherent without pretending Sheets is atomic.
 */
export async function handleMutationRoute(dependencies: {
  context: RequestContext;
  method: string;
  pathname: string;
  body?: string;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  spreadsheetId: string;
  now: () => Date;
}): Promise<CloudRunHttpResponse> {
  const route = matchMutationRoute(dependencies.method, dependencies.pathname);
  if (!route) {
    return { statusCode: 404, headers: {}, body: { error: 'Not found' } };
  }

  const totalStart = nowMs();
  const sheetsClient = await dependencies.sheetsClientFactory();
  const sheets = createQueryContext({ sheetsClient, spreadsheetId: dependencies.spreadsheetId });
  const writer = new DeferredSheetsWriter({
    sheetsClient,
    spreadsheetId: dependencies.spreadsheetId
  });
  const mutationContext = { sheets, writer, now: dependencies.now };
  const body = parseJsonBody(dependencies.body);
  validatePathBodyIdentity(body, route.pathParams);
  const businessStart = nowMs();
  const result = await route.handler({
    context: dependencies.context,
    mutationContext,
    body: { ...body, ...route.pathParams },
    now: dependencies.now
  });
  const businessMs = elapsedMs(businessStart);
  const writeStart = nowMs();
  await writer.flush();
  const writeMs = elapsedMs(writeStart);
  const totalMs = elapsedMs(totalStart);
  const timings = sheets.timings();
  return {
    statusCode: 200,
    headers: {
      'Server-Timing': [
        `sheets-read;dur=${timings.sheetsMs.toFixed(1)}`,
        `mapping;dur=${timings.mappingMs.toFixed(1)}`,
        `business;dur=${businessMs.toFixed(1)}`,
        `sheets-write;dur=${writeMs.toFixed(1)}`,
        `total;dur=${totalMs.toFixed(1)}`
      ].join(', ')
    },
    body: result ?? { ok: true }
  };
}

/**
 * Keeps HTTP payload validation at the boundary so use cases receive plain commands instead of
 * raw JSON strings or Request objects.
 */
function parseJsonBody(body: string | undefined): Record<string, unknown> {
  const text = String(body ?? '').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ValidationError('Request JSON body must be an object.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Malformed JSON request body.');
  }
}

/**
 * Protects dynamic routes from accidental cross-record writes when a request body repeats an ID
 * that is already visible in the URL path.
 */
function validatePathBodyIdentity(
  body: Record<string, unknown>,
  pathParams: Record<string, string> | undefined
): void {
  if (!pathParams) return;
  for (const [key, pathValue] of Object.entries(pathParams)) {
    const bodyValue = body[key];
    if (bodyValue === undefined || bodyValue === null || bodyValue === '') continue;
    if (String(bodyValue) !== pathValue) {
      throw new ValidationError(`${key} in request body does not match URL path.`);
    }
  }
}

/**
 * Resolves collection actions by exact route and resource-targeted commands by URL identity.
 */
function matchMutationRoute(method: string, pathname: string): RouteMatch | null {
  const normalizedMethod = method.toUpperCase();
  const exact = exactRoutes[`${normalizedMethod} ${pathname}`];
  if (exact) return { handler: exact };

  const tradePlanPlanning = pathname.match(/^\/api\/trade-plans\/([^/]+)\/planning$/);
  if (normalizedMethod === 'PATCH' && tradePlanPlanning) {
    return {
      handler: updateTradePlanPlanningForCloudRun,
      pathParams: { tradePlanId: decodeURIComponent(tradePlanPlanning[1]) }
    };
  }

  const tradePlanExecute = pathname.match(/^\/api\/trade-plans\/([^/]+)\/execute$/);
  if (normalizedMethod === 'POST' && tradePlanExecute) {
    return {
      handler: executeTradePlanForCloudRun,
      pathParams: { tradePlanId: decodeURIComponent(tradePlanExecute[1]) }
    };
  }

  const positionClose = pathname.match(/^\/api\/positions\/([^/]+)\/close$/);
  if (normalizedMethod === 'POST' && positionClose) {
    return {
      handler: closePositionForCloudRun,
      pathParams: { positionId: decodeURIComponent(positionClose[1]) }
    };
  }

  const tradingAccount = pathname.match(/^\/api\/admin\/trading-accounts\/([^/]+)$/);
  if (normalizedMethod === 'PATCH' && tradingAccount) {
    return {
      handler: updateTradingAccountForCloudRun,
      pathParams: { accountId: decodeURIComponent(tradingAccount[1]) }
    };
  }

  const strategy = pathname.match(/^\/api\/admin\/strategies\/([^/]+)$/);
  if (normalizedMethod === 'PATCH' && strategy) {
    return {
      handler: updateStrategyForCloudRun,
      pathParams: { strategyId: decodeURIComponent(strategy[1]) }
    };
  }

  const strategyVersion = pathname.match(/^\/api\/admin\/strategies\/([^/]+)\/versions\/([^/]+)$/);
  if (normalizedMethod === 'PATCH' && strategyVersion) {
    return {
      handler: updateStrategyVersionForCloudRun,
      pathParams: {
        strategyId: decodeURIComponent(strategyVersion[1]),
        version: decodeURIComponent(strategyVersion[2])
      }
    };
  }

  return null;
}

const exactRoutes: Record<string, MutationHandler> = {
  'POST /api/discovery/signals/refresh': refreshSignalsForCloudRun,
  'POST /api/discovery/signals/refresh-all': refreshAllSignalsForCloudRun,
  'POST /api/discovery/candidates/watchlist': addDiscoveryCandidateToWatchlistForCloudRun,
  'POST /api/trade-plans': createTradePlanForCloudRun,
  'POST /api/admin/strategies': createStrategyForCloudRun,
  'POST /api/admin/strategy-versions': createStrategyVersionForCloudRun,
  'POST /api/admin/trading-accounts': createTradingAccountForCloudRun,
  'POST /api/admin/trading-accounts/funded': createFundedTradingAccountForCloudRun,
  'POST /api/admin/capital-transactions': recordCapitalTransactionForCloudRun,
  'GET /api/admin/finviz/auth': checkFinvizAuthMutationForCloudRun,
  'PUT /api/admin/finviz/token': setFinvizTokenForCloudRun,
  'DELETE /api/admin/finviz/token': deleteFinvizTokenForCloudRun,
  'POST /api/admin/strategies/setup': setupStrategiesForCloudRun,
  'POST /api/admin/trading-accounts/setup': setupTradingAccountsForCloudRun
};
