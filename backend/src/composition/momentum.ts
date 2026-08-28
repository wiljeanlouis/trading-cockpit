import { refreshMomentumRankingFromSheets } from '../adapters/inbound/google-sheets/refresh-momentum-ranking';
import { GoogleSheetsMomentumRankingProjection } from '../adapters/outbound/google-sheets/momentum/google-sheets-momentum-ranking-projection';
import {
  GoogleSheetsMomentumSignalRepository,
  GoogleSheetsMomentumStrategyRepository
} from '../adapters/outbound/google-sheets/momentum/google-sheets-momentum-signal-repository';
import { createRefreshMomentumRanking } from '../core/application/momentum/refresh-momentum-ranking';
import { RuntimeLogger } from '../adapters/outbound/apps-script/runtime-logger';

export function runRefreshMomentumRanking(): void {
  const logger = new RuntimeLogger('refresh-momentum-ranking');
  logger.start();
  try {
    const refresh = createRefreshMomentumRanking({
      signalRepository: new GoogleSheetsMomentumSignalRepository(),
      strategyRepository: new GoogleSheetsMomentumStrategyRepository(),
      rankingProjection: new GoogleSheetsMomentumRankingProjection(),
      observe: (event, fields) => logger.info(event, fields)
    });
    refreshMomentumRankingFromSheets(() => {
      const result = refresh();
      logger.success({ signalDate: result.signalDate, ranked: result.ranked.length });
      return result;
    });
  } catch (error) {
    logger.error('REFRESH_MOMENTUM_RANKING', error);
    throw error;
  }
}
