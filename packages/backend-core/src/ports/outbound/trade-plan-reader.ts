import type { TradePlan } from '../../domain/trade-plan';

export interface TradePlanReader {
  findAll(): TradePlan[];
}
