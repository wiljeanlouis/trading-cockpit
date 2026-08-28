import { rankMomentumCandidate, type RankedMomentumCandidate } from '../../domain/momentum';
import type { MomentumRankingProjection } from '../../../ports/outbound/momentum-ranking-projection';
import type {
  MomentumSignalRepository,
  MomentumStrategyRepository
} from '../../../ports/outbound/momentum-signal-repository';

export const MOMENTUM_BREAKOUT_STRATEGY_ID = 'MOMENTUM_BREAKOUT';

export interface RefreshMomentumRankingResult {
  ranked: RankedMomentumCandidate[];
  signalDate: string;
}

export function createRefreshMomentumRanking(dependencies: {
  signalRepository: MomentumSignalRepository;
  strategyRepository: MomentumStrategyRepository;
  rankingProjection: MomentumRankingProjection;
}): () => RefreshMomentumRankingResult {
  return () => {
    const strategy = dependencies.strategyRepository.getById(MOMENTUM_BREAKOUT_STRATEGY_ID);
    if (!strategy.enabled) {
      throw new Error(`La stratégie ${strategy.id} est désactivée.`);
    }

    const candidates = dependencies.signalRepository.findByStrategy(strategy.id, strategy.version);
    if (candidates.length === 0) {
      throw new Error(`Aucun signal trouvé pour ${strategy.id} ${strategy.version}.`);
    }

    const signalDates = candidates
      .map((candidate) => candidate.signalDate)
      .filter(Boolean)
      .sort();
    if (signalDates.length === 0) {
      throw new Error('Aucune Signal Date valide.');
    }
    const signalDate = signalDates[signalDates.length - 1];
    const ranked = candidates
      .filter((candidate) => candidate.signalDate === signalDate)
      .map(rankMomentumCandidate)
      .sort((a, b) => b.total - a.total || (b.relativeVolume ?? 0) - (a.relativeVolume ?? 0));

    dependencies.rankingProjection.replace(ranked, signalDate, strategy);
    return { ranked, signalDate };
  };
}
