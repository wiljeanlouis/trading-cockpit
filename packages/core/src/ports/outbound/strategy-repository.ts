export interface StrategyRepository {
  existsById(strategyId: string): boolean;
  existsVersion?(strategyId: string, version: string): boolean;
}
