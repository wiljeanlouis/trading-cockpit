import type { TradingStrategy } from '../../domain/trading-strategy';

export interface TradingStrategyCatalog {
  getById(strategyId: string): TradingStrategy;
  findById(strategyId: string): TradingStrategy | null;
  findAll(): TradingStrategy[];
}
