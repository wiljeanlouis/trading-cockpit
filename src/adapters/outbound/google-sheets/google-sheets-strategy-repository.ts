import type { StrategyRepository } from '../../../ports/outbound/strategy-repository';

declare function getStrategy(strategyId: string): unknown;

export class GoogleSheetsStrategyRepository implements StrategyRepository {
  existsById(strategyId: string): boolean {
    // Preserve the complete legacy registry validation, including its schema errors.
    getStrategy(strategyId);
    return true;
  }
}
