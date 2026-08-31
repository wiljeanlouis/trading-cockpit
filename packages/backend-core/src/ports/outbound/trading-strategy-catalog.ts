import type { TradingStrategySnapshot } from '../../domain/trading-strategy';

export interface TradingStrategyCatalog {
  getById(strategyId: string): TradingStrategySnapshot;
}
