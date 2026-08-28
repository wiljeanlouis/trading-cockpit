import type { TradingStrategySnapshot } from '../../../core/domain/trading-strategy';
import type { TradingStrategyCatalog } from '../../../ports/outbound/trading-strategy-catalog';

interface LegacyStrategy {
  id?: unknown;
  strategyId?: unknown;
  version?: unknown;
  enabled?: unknown;
}

declare function getStrategy(strategyId: string): LegacyStrategy;

export class GoogleSheetsTradingStrategyCatalog implements TradingStrategyCatalog {
  getById(strategyId: string): TradingStrategySnapshot {
    const strategy = getStrategy(strategyId);
    return {
      id: String(strategy.id ?? strategy.strategyId ?? strategyId).trim(),
      version: String(strategy.version ?? '').trim(),
      enabled: Boolean(strategy.enabled)
    };
  }
}
