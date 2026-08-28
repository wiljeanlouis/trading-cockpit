import type { TradePlan } from '../../core/domain/trade-plan';

export interface TradePlanReader {
  findAll(): TradePlan[];
}
