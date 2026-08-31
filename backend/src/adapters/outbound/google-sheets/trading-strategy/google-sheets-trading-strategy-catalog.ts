import type { TradingStrategySnapshot } from '@trading-cockpit/backend-core/domain/trading-strategy';
import type { TradingStrategyCatalog } from '@trading-cockpit/backend-core/ports/outbound/trading-strategy-catalog';
import { GoogleSheetsTradingStrategyReader } from './google-sheets-trading-strategy-reader';

export class GoogleSheetsTradingStrategyCatalog implements TradingStrategyCatalog {
  constructor(private readonly reader = new GoogleSheetsTradingStrategyReader()) {}

  getById(strategyId: string): TradingStrategySnapshot {
    const strategy = this.reader.getById(strategyId);
    return {
      id: strategy.id,
      version: strategy.version,
      enabled: strategy.enabled
    };
  }
}
