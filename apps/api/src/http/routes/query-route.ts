import type { CloudRunHttpResponse } from '../../app';
import type { RequestScopedSheets } from '../../adapters/outbound/google-sheets-api/sheets-api-table';
import { createQueryContext } from '../../composition/query-context';
import { elapsedMs, nowMs, serverTimingHeader } from '../../timing';
import type { SheetsValuesClient } from '../../adapters/outbound/google-sheets-api/google-sheets-api-client';
import type { RequestContext } from '../request-context';

export async function handleTimedQuery<T>(dependencies: {
  context: RequestContext;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  spreadsheetId: string;
  query: (dependencies: {
    context: RequestContext;
    sheets: RequestScopedSheets;
    now: () => Date;
  }) => Promise<T>;
  now: () => Date;
  itemCount?: (dto: T) => number;
}): Promise<CloudRunHttpResponse> {
  const totalStart = nowMs();
  const sheetsClient = await dependencies.sheetsClientFactory();
  const sheets = createQueryContext({
    sheetsClient,
    spreadsheetId: dependencies.spreadsheetId
  });
  const dto = await dependencies.query({
    context: dependencies.context,
    sheets,
    now: dependencies.now
  });
  const totalMs = elapsedMs(totalStart);
  const timings = sheets.timings();
  const headers: Record<string, string> = {
    'Server-Timing': serverTimingHeader({
      sheetsMs: timings.sheetsMs,
      mappingMs: timings.mappingMs,
      totalMs
    })
  };

  if (dependencies.itemCount) {
    headers['X-Trading-Cockpit-Items'] = String(dependencies.itemCount(dto));
  }

  return {
    statusCode: 200,
    headers,
    body: dto
  };
}
