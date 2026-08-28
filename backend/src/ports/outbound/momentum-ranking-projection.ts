import type { RankedMomentumCandidate } from '../../core/domain/momentum';
import type { MomentumStrategySnapshot } from './momentum-signal-repository';

export interface MomentumRankingProjection {
  replace(
    ranked: RankedMomentumCandidate[],
    signalDate: string,
    strategy: MomentumStrategySnapshot
  ): void;
}
