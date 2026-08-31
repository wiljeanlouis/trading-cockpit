import type { RefreshMomentumRankingResult } from '@trading-cockpit/backend-core/application/momentum/refresh-momentum-ranking';

export function refreshMomentumRankingFromSheets(
  refresh: () => RefreshMomentumRankingResult
): void {
  const result = refresh();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `${result.ranked.length} candidats classés pour ${result.signalDate}.`,
    'Momentum Ranking',
    5
  );
}
