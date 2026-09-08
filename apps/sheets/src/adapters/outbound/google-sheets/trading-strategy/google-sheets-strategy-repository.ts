import type { StrategyRepository } from '@trading-cockpit/core/ports/outbound/strategy-repository';
import { GoogleSheetsTradingStrategyReader } from './google-sheets-trading-strategy-reader';

/**
 * Strategy lookup adapter for Apps Script workflows. It delegates physical sheet reads to the
 * strategy reader while exposing the small repository contract needed by core use cases.
 */
export class GoogleSheetsStrategyRepository implements StrategyRepository {
  constructor(private readonly reader = new GoogleSheetsTradingStrategyReader()) {}

  existsById(strategyId: string): boolean {
    this.reader.getById(strategyId);
    return true;
  }

  existsVersion(strategyId: string, version: string): boolean {
    return Boolean(this.reader.findVersion(strategyId, version));
  }
}
