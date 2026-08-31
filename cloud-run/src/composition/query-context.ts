import { createRequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';
import type { SheetsValuesClient } from '../adapters/outbound/google-sheets-api/google-sheets-api-client';

export function createQueryContext(dependencies: {
  sheetsClient: SheetsValuesClient;
  spreadsheetId: string;
}) {
  return createRequestScopedSheets(dependencies);
}
