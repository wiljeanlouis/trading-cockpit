import type { StrategyRepository } from '../../../ports/outbound/strategy-repository';
import { GoogleSheetsTradingStrategyReader } from './google-sheets-trading-strategy-reader';

export class GoogleSheetsStrategyRepository implements StrategyRepository {
  constructor(private readonly reader = new GoogleSheetsTradingStrategyReader()) {}

  existsById(strategyId: string): boolean {
    this.reader.getById(strategyId);
    return true;
  }
}
