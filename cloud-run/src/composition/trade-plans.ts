import { createGetTradePlans } from '@trading-cockpit/backend-core/application/trade-plan/get-trade-plans';
import type { TradePlansDto } from '@trading-cockpit/contracts';
import {
  LoadedTradePlanReader,
  readStrategyIds,
  readTradePlans,
  SHEET_DEFINITIONS
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getTradePlansForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<TradePlansDto> {
  await dependencies.sheets.batchLoad([SHEET_DEFINITIONS.tradePlans, SHEET_DEFINITIONS.strategies]);
  const strategyIds = await readStrategyIds(dependencies.sheets);
  return createGetTradePlans({
    reader: new LoadedTradePlanReader(await readTradePlans(dependencies.sheets)),
    strategyIds: () => strategyIds,
    now: dependencies.now
  })();
}
