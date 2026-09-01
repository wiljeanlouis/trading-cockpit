import { createGetAnalytics } from '@trading-cockpit/core/application/analytics/get-analytics';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import {
  LoadedJournalReader,
  readJournalEntries,
  readTradingAccounts
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import type { RequestContext } from '../http/request-context';

export async function getAnalyticsForCloudRun(dependencies: {
  context: RequestContext;
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<AnalyticsDto> {
  const entries = await readJournalEntries(dependencies.sheets);
  const accounts = await readTradingAccounts(dependencies.sheets);
  const accountId = accountScopeFromQuery(dependencies.context.query);
  const strategyId = stringQueryValue(dependencies.context.query, 'strategyId')?.toUpperCase();
  const strategyVersion = stringQueryValue(dependencies.context.query, 'strategyVersion');
  if (accountId && !accounts.some((account) => account.id === accountId)) {
    throw new Error(`Trading Account introuvable : ${accountId}`);
  }
  return createGetAnalytics({
    journalReader: new LoadedJournalReader(entries),
    now: dependencies.now,
    accounts
  })({
    scope: accountId ? { type: 'ACCOUNT', accountId } : { type: 'ALL' },
    strategyId: strategyId ?? undefined,
    strategyVersion: strategyVersion ?? undefined
  });
}

function accountScopeFromQuery(query: URLSearchParams): string | null {
  return stringQueryValue(query, 'accountId')?.toUpperCase() ?? null;
}

function stringQueryValue(query: URLSearchParams, name: string): string | null {
  const value = String(query.get(name) || '').trim();
  return value || null;
}
