import type { SignalSnapshot } from '../../domain/market-signal';
import type { TradingStrategy } from '../../domain/trading-strategy';

export interface DiscoverySignalReader {
  findAllSignals(): SignalSnapshot[];
  findAllStrategies(): TradingStrategy[];
}
