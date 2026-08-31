import type { MomentumCandidate } from '../../domain/momentum';

export interface MomentumStrategySnapshot {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface MomentumSignalRepository {
  findByStrategy(strategyId: string, strategyVersion: string): MomentumCandidate[];
}

export interface MomentumStrategyRepository {
  getById(strategyId: string): MomentumStrategySnapshot;
}
