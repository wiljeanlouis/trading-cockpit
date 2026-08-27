import type { TradingConfigurationPort } from '../../../ports/outbound/trading-configuration-port';

interface LegacyTradingConfiguration {
  accountEquity: number;
  defaultRiskPercent: number;
}

declare function getTradingConfig(): LegacyTradingConfiguration;

export class GoogleSheetsTradingConfiguration implements TradingConfigurationPort {
  getRiskConfiguration() {
    const configuration = getTradingConfig();

    return {
      accountEquity: configuration.accountEquity,
      riskPercent: configuration.defaultRiskPercent
    };
  }
}
