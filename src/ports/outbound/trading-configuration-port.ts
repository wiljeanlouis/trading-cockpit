import type { TradingRiskConfiguration } from '../../core/domain/trade-plan';

export interface TradingConfigurationPort {
  getRiskConfiguration(): TradingRiskConfiguration;
}
