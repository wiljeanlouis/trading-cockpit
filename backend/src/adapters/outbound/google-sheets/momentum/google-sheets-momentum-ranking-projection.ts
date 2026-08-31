import type { RankedMomentumCandidate } from '@trading-cockpit/backend-core/domain/momentum';
import type { MomentumRankingProjection } from '@trading-cockpit/backend-core/ports/outbound/momentum-ranking-projection';
import type { MomentumStrategySnapshot } from '@trading-cockpit/backend-core/ports/outbound/momentum-signal-repository';
import { themeRanking } from '../../../inbound/google-sheets/theme/theme';
import { DATA_SHEET_DATA_START_ROW, DATA_SHEET_HEADER_ROW } from '../data-sheet';
import { MOMENTUM_RANKING_HEADERS, MOMENTUM_RANKING_SHEET_NAME } from './momentum-ranking-schema';

export { MOMENTUM_RANKING_HEADERS } from './momentum-ranking-schema';

export class GoogleSheetsMomentumRankingProjection implements MomentumRankingProjection {
  replace(
    ranked: RankedMomentumCandidate[],
    signalDate: string,
    strategy: MomentumStrategySnapshot
  ): void {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      spreadsheet.getSheetByName(MOMENTUM_RANKING_SHEET_NAME) ??
      spreadsheet.insertSheet(MOMENTUM_RANKING_SHEET_NAME);
    sheet.clear();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
    sheet
      .getRange(DATA_SHEET_HEADER_ROW, 1, 1, MOMENTUM_RANKING_HEADERS.length)
      .setValues([[...MOMENTUM_RANKING_HEADERS]])
      .setFontWeight('bold');
    const output = ranked.map((item, index) => [
      index + 1,
      item.strategyId,
      item.strategy || strategy.name,
      item.strategyVersion,
      item.signalDate,
      item.ticker,
      item.company,
      item.sector,
      item.price,
      item.high52,
      item.high52Score,
      item.relativeVolume,
      item.relativeVolumeScore,
      item.performanceMonth,
      item.performanceScore,
      item.rsi,
      item.rsiScore,
      item.sma20,
      item.sma20Score,
      item.total,
      'REVIEW'
    ]);
    if (output.length > 0) {
      sheet
        .getRange(DATA_SHEET_DATA_START_ROW, 1, output.length, MOMENTUM_RANKING_HEADERS.length)
        .setValues(output);
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 5, output.length, 1).setNumberFormat('yyyy-mm-dd');
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 9, output.length, 1).setNumberFormat('0.00');
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 10, output.length, 1).setNumberFormat('0.00%');
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 14, output.length, 1).setNumberFormat('0.00%');
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 18, output.length, 1).setNumberFormat('0.00%');
      sheet.getRange(DATA_SHEET_DATA_START_ROW, 20, output.length, 1).setNumberFormat('0');
    }
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['REVIEW', 'WATCH', 'READY', 'REJECT'], true)
      .setAllowInvalid(false)
      .build();
    sheet
      .getRange(DATA_SHEET_DATA_START_ROW, 21, Math.max(output.length, 1), 1)
      .setDataValidation(statusRule);
    sheet.setFrozenRows(DATA_SHEET_HEADER_ROW);
    sheet.autoResizeColumns(1, MOMENTUM_RANKING_HEADERS.length);
    themeRanking(spreadsheet);
  }
}
