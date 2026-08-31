import { createListTradingAccounts } from '@trading-cockpit/backend-core/application/trading-account/list-trading-accounts';
import type { TradingAccountsDto, TradingConfigDto } from '@trading-cockpit/contracts';
import {
  LoadedTradingAccountRepository,
  readTradingAccounts,
  readTradingConfig,
  validateStrategies as validateStrategiesFromSheets
} from '../adapters/outbound/google-sheets-api/cockpit-query-readers';
import type { RequestScopedSheets } from '../adapters/outbound/google-sheets-api/sheets-api-table';

export async function getTradingAccountsForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<TradingAccountsDto> {
  const accounts = createListTradingAccounts(
    new LoadedTradingAccountRepository(await readTradingAccounts(dependencies.sheets))
  )();
  return {
    accounts
  };
}

export async function getTradingConfigForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<TradingConfigDto> {
  return readTradingConfig(dependencies.sheets);
}

export async function validateStrategiesForCloudRun(dependencies: {
  sheets: RequestScopedSheets;
}): Promise<true> {
  return validateStrategiesFromSheets(dependencies.sheets);
}

export function checkFinvizAuthForCloudRun(): never {
  throw new Error(
    'Finviz auth status is not available in Cloud Run until Secret Manager token storage is migrated.'
  );
}
