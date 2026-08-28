import type { TradingAccountRiskPolicy } from '../../core/domain/trading-account-risk-policy';

export interface TradingAccountRiskPolicyRepository {
  findByAccountId(accountId: string): TradingAccountRiskPolicy | null;
}
