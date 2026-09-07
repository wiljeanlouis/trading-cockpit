import type {
  TradingStrategySnapshot,
  TradingStrategy,
  TradingStrategyVersion
} from '@trading-cockpit/core/domain/trading-strategy';
import type {
  TradingStrategyCatalog,
  VersionedTradingStrategyCatalog
} from '@trading-cockpit/core/ports/outbound/trading-strategy-catalog';
import { GoogleSheetsTradingStrategyReader } from './google-sheets-trading-strategy-reader';

export class GoogleSheetsTradingStrategyCatalog
  implements TradingStrategyCatalog, VersionedTradingStrategyCatalog
{
  constructor(private readonly reader = new GoogleSheetsTradingStrategyReader()) {}

  getById(strategyId: string): TradingStrategySnapshot {
    const strategy = this.reader.getById(strategyId);
    const activeVersion = this.reader.findActiveVersion(strategy.id);
    if (!activeVersion) throw new Error(`Aucune version active pour ${strategy.id}.`);
    return {
      id: strategy.id,
      version: activeVersion.version,
      enabled: strategy.enabled
    };
  }

  findStrategyById(strategyId: string): TradingStrategy | null {
    try {
      return this.reader.getById(strategyId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Stratégie inconnue')) return null;
      throw error;
    }
  }

  findVersion(strategyId: string, version: string): TradingStrategyVersion | null {
    return this.reader.findVersion(strategyId, version);
  }

  findActiveVersion(strategyId: string): TradingStrategyVersion | null {
    return this.reader.findActiveVersion(strategyId);
  }
}
