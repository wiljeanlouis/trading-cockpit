import type {
  TradingStrategySnapshot,
  TradingStrategy,
  TradingStrategyVersion
} from '../../domain/trading-strategy';

export interface TradingStrategyCatalog {
  getById(strategyId: string): TradingStrategySnapshot;
}

export interface VersionedTradingStrategyCatalog {
  findStrategyById(strategyId: string): TradingStrategy | null;
  findVersion(strategyId: string, version: string): TradingStrategyVersion | null;
  findActiveVersion(strategyId: string): TradingStrategyVersion | null;
}
