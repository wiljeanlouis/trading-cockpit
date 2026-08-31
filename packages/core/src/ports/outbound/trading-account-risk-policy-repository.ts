import type { TradingAccountRiskPolicy } from '../../domain/trading-account-risk-policy';

export interface TradingAccountRiskPolicyRepository {
  findByAccountId(accountId: string): TradingAccountRiskPolicy | null;
}
