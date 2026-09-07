import type { SignalSnapshot } from '../../domain/market-signal';
import type { TradingStrategy, TradingStrategyVersion } from '../../domain/trading-strategy';

export interface DiscoverySignalReader {
  findAllSignals(): SignalSnapshot[];
  findAllStrategies(): TradingStrategy[];
  findAllStrategyVersions(): TradingStrategyVersion[];
}
