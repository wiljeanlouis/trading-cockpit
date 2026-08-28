import { refreshMomentumRankingFromSheets } from '../adapters/inbound/google-sheets/refresh-momentum-ranking';
import { GoogleSheetsMomentumRankingProjection } from '../adapters/outbound/google-sheets/google-sheets-momentum-ranking-projection';
import {
  GoogleSheetsMomentumSignalRepository,
  GoogleSheetsMomentumStrategyRepository
} from '../adapters/outbound/google-sheets/google-sheets-momentum-signal-repository';
import { createRefreshMomentumRanking } from '../core/application/momentum/refresh-momentum-ranking';

export function runRefreshMomentumRanking(): void {
  refreshMomentumRankingFromSheets(
    createRefreshMomentumRanking({
      signalRepository: new GoogleSheetsMomentumSignalRepository(),
      strategyRepository: new GoogleSheetsMomentumStrategyRepository(),
      rankingProjection: new GoogleSheetsMomentumRankingProjection()
    })
  );
}
