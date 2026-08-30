import type { RankedMomentumCandidate } from '../../core/domain/momentum';

export interface MomentumRankingRecord extends RankedMomentumCandidate {
  reviewStatus: string;
}

export interface MomentumRankingIdentity {
  strategyId: string;
  strategyVersion: string;
  signalDate: string;
  ticker: string;
}

export interface MomentumRankingReader {
  findAll(): MomentumRankingRecord[];
  findByIdentity(identity: MomentumRankingIdentity): MomentumRankingRecord | null;
}
