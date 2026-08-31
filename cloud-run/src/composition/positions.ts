import { createGetOpenPositions } from '@trading-cockpit/backend-core/application/position/get-open-positions';
import type { OpenPositionsDto } from '@trading-cockpit/contracts';
import {
  LoadedPositionReader,
  readPositions
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getOpenPositionsForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
  now: () => Date;
}): Promise<OpenPositionsDto> {
  return createGetOpenPositions({
    reader: new LoadedPositionReader(await readPositions(dependencies.sheets)),
    now: dependencies.now
  })();
}
