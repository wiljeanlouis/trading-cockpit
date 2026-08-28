import type { TradingStrategySnapshot } from '../../core/domain/trading-strategy';

export interface TradingStrategyCatalog {
  getById(strategyId: string): TradingStrategySnapshot;
}
